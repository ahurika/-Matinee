// Race tests for seat holds. Run against a SEPARATE test database and a throwaway Redis (see server/.env.test.example).
// They create and TRUNCATE simple bookings and seat_holds tables and call redis.flushdb().
import { Redis } from 'ioredis';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { holdSeatsInDb } from '../src/seats/dbHolds.js';
import { extendSeats, holdKey, holdSeats, readAvailability, registerScripts, releaseSeats } from '../src/seats/redisHolds.js';

const redis = new Redis(process.env.REDIS_URL!);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL!, max: 20 });
registerScripts(redis);

const ST = 'showtime-1';
const seats = (n: number) => Array.from({ length: n }, (_, i) => `S${i + 1}`);
const pick = <T,>(arr: T[], k: number) => [...arr].sort(() => Math.random() - 0.5).slice(0, k);

beforeAll(async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
    id bigserial PRIMARY KEY, showtime_id text NOT NULL, seat_id text NOT NULL, user_id text NOT NULL,
    CONSTRAINT bookings_showtime_seat_uniq UNIQUE (showtime_id, seat_id))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS seat_holds (
    showtime_id text NOT NULL, seat_id text NOT NULL, hold_id text NOT NULL, expires_at timestamptz NOT NULL,
    PRIMARY KEY (showtime_id, seat_id))`);
});
beforeEach(async () => {
  await redis.flushdb();
  await pool.query('TRUNCATE bookings, seat_holds RESTART IDENTITY');
});
afterAll(async () => { await redis.quit(); await pool.end(); });

describe('seat holds under concurrency', () => {
  it('500 users race for the same 50 seats: exactly 50 win, no seat has two holders', async () => {
    const all = seats(50);
    const results = await Promise.all(
      Array.from({ length: 500 }, (_, u) =>
        holdSeats(redis, { showtimeId: ST, seatIds: [all[u % 50]!], holdId: `user-${u}`, ttlMs: 600000 }),
      ),
    );
    const winners = results.filter((r) => r.ok).length;
    expect(winners).toBe(50);
    const owners = await Promise.all(all.map((s) => redis.get(holdKey(ST, s))));
    expect(owners.every((o) => o !== null)).toBe(true);
    expect(new Set(owners).size).toBe(50);
  });

  it('multi-seat holds are all or nothing (no partial holds)', async () => {
    const all = seats(30);
    const users = Array.from({ length: 200 }, (_, u) => ({ id: `user-${u}`, want: pick(all, 3) }));
    const results = await Promise.all(users.map((u) => holdSeats(redis, { showtimeId: ST, seatIds: u.want, holdId: u.id, ttlMs: 600000 })));
    for (const [i, u] of users.entries()) {
      const owned = (await Promise.all(u.want.map((s) => redis.get(holdKey(ST, s))))).filter((o) => o === u.id).length;
      expect(owned).toBe(results[i]!.ok ? 3 : 0);
    }
  });

  it('holds expire and the seat can be taken by someone else', async () => {
    expect((await holdSeats(redis, { showtimeId: ST, seatIds: ['A1'], holdId: 'a', ttlMs: 150 })).ok).toBe(true);
    expect((await holdSeats(redis, { showtimeId: ST, seatIds: ['A1'], holdId: 'b', ttlMs: 600000 })).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 250));
    expect((await holdSeats(redis, { showtimeId: ST, seatIds: ['A1'], holdId: 'b', ttlMs: 600000 })).ok).toBe(true);
  });

  it('only the owner can release a hold', async () => {
    await holdSeats(redis, { showtimeId: ST, seatIds: ['A1', 'A2'], holdId: 'a', ttlMs: 600000 });
    expect(await releaseSeats(redis, { showtimeId: ST, seatIds: ['A1', 'A2'], holdId: 'intruder' })).toBe(0);
    expect(await releaseSeats(redis, { showtimeId: ST, seatIds: ['A1', 'A2'], holdId: 'a' })).toBe(2);
  });

  it('sold seats cannot be held', async () => {
    await redis.sadd(`sold:{${ST}}`, 'A1');
    const r = await holdSeats(redis, { showtimeId: ST, seatIds: ['A1', 'A2'], holdId: 'a', ttlMs: 600000 });
    expect(r).toEqual({ ok: false, reason: 'SOLD', seatId: 'A1' });
    expect(await redis.get(holdKey(ST, 'A2'))).toBeNull(); // nothing partially held
  });

  it('same user can re-send the same hold (idempotent)', async () => {
    expect((await holdSeats(redis, { showtimeId: ST, seatIds: ['A1'], holdId: 'a', ttlMs: 600000 })).ok).toBe(true);
    expect((await holdSeats(redis, { showtimeId: ST, seatIds: ['A1'], holdId: 'a', ttlMs: 600000 })).ok).toBe(true);
  });
});

describe('availability index and payment grace', () => {
  it('availability lists live holds and sold seats, and the version changes on every change', async () => {
    const v0 = (await readAvailability(redis, ST)).version;
    await holdSeats(redis, { showtimeId: ST, seatIds: ['A1', 'A2'], holdId: 'a', ttlMs: 600000 });
    await redis.sadd(`sold:{${ST}}`, 'B1');
    const a1 = await readAvailability(redis, ST);
    expect(a1.held.sort()).toEqual(['A1', 'A2']);
    expect(a1.sold).toEqual(['B1']);
    expect(a1.version).toBeGreaterThan(v0);
    await releaseSeats(redis, { showtimeId: ST, seatIds: ['A1'], holdId: 'a' });
    const a2 = await readAvailability(redis, ST);
    expect(a2.held).toEqual(['A2']);
    expect(a2.version).toBeGreaterThan(a1.version);
  });

  it('expired holds disappear from availability', async () => {
    await holdSeats(redis, { showtimeId: ST, seatIds: ['A1'], holdId: 'a', ttlMs: 100 });
    await new Promise((r) => setTimeout(r, 200));
    expect((await readAvailability(redis, ST)).held).toEqual([]);
  });

  it('payment grace extends only seats the holder still owns and never shortens', async () => {
    await holdSeats(redis, { showtimeId: ST, seatIds: ['A1', 'A2'], holdId: 'a', ttlMs: 2000 });
    await holdSeats(redis, { showtimeId: ST, seatIds: ['A3'], holdId: 'other', ttlMs: 600000 });
    expect(await extendSeats(redis, { showtimeId: ST, seatIds: ['A1', 'A2', 'A3'], holdId: 'a', ttlMs: 420000 })).toBe(2);
    expect(await redis.pttl(holdKey(ST, 'A1'))).toBeGreaterThan(400000);
    expect(await redis.pttl(holdKey(ST, 'A3'))).toBeGreaterThan(500000); // not touched, still the other user's long hold
    await extendSeats(redis, { showtimeId: ST, seatIds: ['A1'], holdId: 'a', ttlMs: 1000 }); // shorter request: ignored
    expect(await redis.pttl(holdKey(ST, 'A1'))).toBeGreaterThan(400000);
  });
});

describe('database safety net and fallback', () => {
  it('unique constraint: 500 concurrent bookings for 50 seats create exactly 50 rows', async () => {
    const all = seats(50);
    const results = await Promise.allSettled(
      Array.from({ length: 500 }, (_, u) =>
        pool.query('INSERT INTO bookings (showtime_id, seat_id, user_id) VALUES ($1,$2,$3)', [ST, all[u % 50], `user-${u}`]),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(ok).toBe(50);
    expect(failed.every((f) => (f.reason as { code?: string }).code === '23505')).toBe(true);
    const { rows } = await pool.query('SELECT count(*)::int AS n, count(DISTINCT seat_id)::int AS d FROM bookings');
    expect(rows[0]).toEqual({ n: 50, d: 50 });
  });

  it('database fallback holds: 300 users race for 50 seats, exactly 50 win', async () => {
    const all = seats(50);
    const results = await Promise.all(
      Array.from({ length: 300 }, (_, u) =>
        holdSeatsInDb(pool, { showtimeId: ST, seatIds: [all[u % 50]!], holdId: `user-${u}`, ttlMs: 600000 }).catch(() => false),
      ),
    );
    expect(results.filter(Boolean).length).toBe(50);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM seat_holds');
    expect(rows[0].n).toBe(50);
  });

  it('database fallback refuses a seat that is already booked', async () => {
    await pool.query("INSERT INTO bookings (showtime_id, seat_id, user_id) VALUES ($1,'A1','u')", [ST]);
    expect(await holdSeatsInDb(pool, { showtimeId: ST, seatIds: ['A1', 'A2'], holdId: 'x', ttlMs: 600000 })).toBe(false);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM seat_holds');
    expect(rows[0].n).toBe(0);
  });
});
