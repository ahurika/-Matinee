import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { pool } from '../src/lib/db.js';
import { redis } from '../src/lib/redis.js';

describe('Showtimes, Holds, Waiting Room & ETag Availability (M3 / T1-T8, T18)', () => {
  let authTokenUser1: string;
  let authTokenUser2: string;
  const showtimeId = 'st-dune-sb1-today-1800';

  beforeAll(async () => {
    // Seed cinema, screen, seats, and showtime in test database if missing
    await pool.query(`
      INSERT INTO cinemas (id, name, city, address)
      VALUES ('cinema-silverbird-vi', 'Silverbird Cinemas', 'Lagos', '133 Ahmadu Bello Way, Victoria Island')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO screens (id, cinema_id, name, rows, seat_count)
      VALUES ('screen-sb-1', 'cinema-silverbird-vi', 'Screen 1 (Standard)', 16, 320)
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO showtimes (id, movie_tmdb_id, screen_id, starts_at, booking_opens_at, status, price_standard_kobo, price_premium_kobo)
      VALUES ('st-dune-sb1-today-1800', 693134, 'screen-sb-1', now() + interval '2 hours', now() - interval '2 days', 'scheduled', 450000, 650000)
      ON CONFLICT (id) DO UPDATE SET booking_opens_at = now() - interval '2 days';
    `);

    // Ensure seats exist for screen-sb-1
    const seatCheck = await pool.query('SELECT count(*) FROM seats WHERE screen_id = $1', ['screen-sb-1']);
    if (parseInt(seatCheck.rows[0].count, 10) < 320) {
      const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
      for (const row of rowLabels) {
        for (let col = 1; col <= 20; col++) {
          await pool.query(`
            INSERT INTO seats (id, screen_id, row_label, number, col_index, kind)
            VALUES ('screen-sb-1-' || $1 || $2, 'screen-sb-1', $1, $2::int, $2::int, 'standard')
            ON CONFLICT (screen_id, row_label, number) DO NOTHING;
          `, [row, col]);
        }
      }
    }
  });

  beforeEach(async () => {
    await redis.flushdb();
    await pool.query("DELETE FROM users WHERE email LIKE '%@matinee.test'");

    const uid = Math.random().toString(36).substring(7);

    // Register user 1
    const res1 = await app.request('/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `holder1_${uid}@matinee.test`, password: 'password12345' }),
    });
    const body1 = (await res1.json()) as any;
    authTokenUser1 = body1.accessToken;

    // Register user 2
    const res2 = await app.request('/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `holder2_${uid}@matinee.test`, password: 'password12345' }),
    });
    const body2 = (await res2.json()) as any;
    authTokenUser2 = body2.accessToken;
  });

  afterAll(async () => {
    await redis.quit();
    await pool.end();
  });

  it('GET /v1/showtimes/:id returns showtime details', async () => {
    const res = await app.request(`/v1/showtimes/${showtimeId}`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.showtime.id).toBe(showtimeId);
    expect(body.showtime.screen_name).toBe('Screen 1 (Standard)');
    expect(body.showtime.cinema_name).toBe('Silverbird Cinemas');
  });

  it('GET /v1/showtimes/:id/seatmap returns 320 seats for Screen 1', async () => {
    const res = await app.request(`/v1/showtimes/${showtimeId}/seatmap`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.screenId).toBe('screen-sb-1');
    expect(body.seats.length).toBe(320);
  });

  it('T18: availability returns 304 when unchanged and 200 with new ETag on hold', async () => {
    // 1. Initial availability
    const res1 = await app.request(`/v1/showtimes/${showtimeId}/availability`);
    expect(res1.status).toBe(200);
    const etag1 = res1.headers.get('etag');
    expect(etag1).toBe('"v0"');

    const body1 = (await res1.json()) as any;
    expect(body1.heldSeatIds).toEqual([]);
    expect(body1.soldSeatIds).toEqual([]);

    // 2. Poll with If-None-Match -> MUST return 304 Not Modified (T18)
    const res2 = await app.request(`/v1/showtimes/${showtimeId}/availability`, {
      headers: { 'If-None-Match': etag1! },
    });
    expect(res2.status).toBe(304);

    // 3. User 1 holds seats
    const holdRes = await app.request(`/v1/showtimes/${showtimeId}/hold`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authTokenUser1}`,
      },
      body: JSON.stringify({ seatIds: ['screen-sb-1-A1', 'screen-sb-1-A2'] }),
    });
    expect(holdRes.status).toBe(200);

    // 4. Poll again with previous etag1 -> Version changed! Must return 200 with new ETag
    const res3 = await app.request(`/v1/showtimes/${showtimeId}/availability`, {
      headers: { 'If-None-Match': etag1! },
    });
    expect(res3.status).toBe(200);
    const etag2 = res3.headers.get('etag');
    expect(etag2).not.toBe(etag1);

    const body3 = (await res3.json()) as any;
    expect(body3.heldSeatIds).toEqual(['screen-sb-1-A1', 'screen-sb-1-A2']);
  });

  it('rejects conflicting holds (409 SEAT_TAKEN) and allows release', async () => {
    // User 1 holds A3 and A4
    const hold1 = await app.request(`/v1/showtimes/${showtimeId}/hold`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authTokenUser1}`,
      },
      body: JSON.stringify({ seatIds: ['screen-sb-1-A3', 'screen-sb-1-A4'] }),
    });
    expect(hold1.status).toBe(200);

    // User 2 attempts to hold A4 and A5 -> MUST fail atomically with 409 SEAT_TAKEN
    const hold2 = await app.request(`/v1/showtimes/${showtimeId}/hold`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authTokenUser2}`,
      },
      body: JSON.stringify({ seatIds: ['screen-sb-1-A4', 'screen-sb-1-A5'] }),
    });
    expect(hold2.status).toBe(409);
    const body2 = (await hold2.json()) as any;
    expect(body2.error.code).toBe('SEAT_TAKEN');

    // A5 must NOT be held by User 2 because multi-seat hold is all-or-nothing (T2)
    const avail = await app.request(`/v1/showtimes/${showtimeId}/availability`);
    const availBody = (await avail.json()) as any;
    expect(availBody.heldSeatIds).not.toContain('screen-sb-1-A5');

    // User 1 releases their hold
    const rel = await app.request(`/v1/showtimes/${showtimeId}/hold`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authTokenUser1}` },
    });
    expect(rel.status).toBe(200);

    // Now User 2 can successfully hold A4 and A5
    const hold3 = await app.request(`/v1/showtimes/${showtimeId}/hold`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authTokenUser2}`,
      },
      body: JSON.stringify({ seatIds: ['screen-sb-1-A4', 'screen-sb-1-A5'] }),
    });
    expect(hold3.status).toBe(200);
  });

  it('waiting room admits user directly when under capacity', async () => {
    const res = await app.request(`/v1/showtimes/${showtimeId}/waiting-room/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authTokenUser1}`,
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.state).toBe('ACTIVE');
  });
});
