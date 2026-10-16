import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { paystackClient } from '../src/integrations/paystack/paystackClient.js';
import { pool } from '../src/lib/db.js';
import { redis } from '../src/lib/redis.js';

describe('Payments, Webhooks, Ledger & Tickets (M4 / T9-T14, T17)', () => {
  let authToken: string;
  let userEmail: string;
  const showtimeId = 'st-dune-sb1-today-1800';

  beforeAll(async () => {
    // Ensure seed data in test DB
    await pool.query(`
      INSERT INTO cinemas (id, name, city, address)
      VALUES ('cinema-silverbird-vi', 'Silverbird Cinemas', 'Lagos', '133 Ahmadu Bello Way, Victoria Island')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO screens (id, cinema_id, name, rows, seat_count)
      VALUES ('screen-sb-1', 'cinema-silverbird-vi', 'Screen 1 (Standard)', 16, 320)
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO showtimes (id, movie_tmdb_id, screen_id, starts_at, booking_opens_at, status, price_standard_kobo, price_premium_kobo)
      VALUES ('st-dune-sb1-today-1800', 693134, 'screen-sb-1', now() + interval '2 hours', now() - interval '2 days', 'scheduled', 450000, 650000)
      ON CONFLICT (id) DO UPDATE SET booking_opens_at = now() - interval '2 days', status = 'scheduled';
    `);

    // Ensure seats exist
    const seatCheck = await pool.query('SELECT count(*) FROM seats WHERE screen_id = $1', ['screen-sb-1']);
    if (parseInt(seatCheck.rows[0].count, 10) < 320) {
      const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
      for (const row of rowLabels) {
        for (let col = 1; col <= 20; col++) {
          await pool.query(
            `INSERT INTO seats (id, screen_id, row_label, number, col_index, kind)
             VALUES ('screen-sb-1-' || $1 || $2, 'screen-sb-1', $1, $2::int, $2::int, 'standard')
             ON CONFLICT (screen_id, row_label, number) DO NOTHING;`,
            [row, col],
          );
        }
      }
    }
    // Ensure usr_stealer exists for foreign key references
    await pool.query(
      `INSERT INTO users (id, email, password_hash) VALUES ('usr_stealer', 'stealer@example.com', 'dummyhash') ON CONFLICT (id) DO NOTHING;`,
    );
  });

  beforeEach(async () => {
    await redis.flushdb();
    await pool.query('DELETE FROM bookings WHERE showtime_id = $1', [showtimeId]);
    await pool.query('DELETE FROM webhook_events');
    await pool.query('DELETE FROM idempotency_keys');
    await pool.query("DELETE FROM users WHERE email LIKE '%@paytest.matinee%'");
    await pool.query("UPDATE showtimes SET status = 'scheduled' WHERE id = $1", [showtimeId]);

    const uid = Math.random().toString(36).substring(7);
    userEmail = `buyer_${uid}@paytest.matinee`;

    const reg = await app.request('/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: 'securePassword123' }),
    });
    const regBody = (await reg.json()) as any;
    authToken = regBody.accessToken;
  });

  afterAll(async () => {
    await redis.quit();
    await pool.end();
  });

  it('T10: Idempotent order creation (same key returns stored response, conflict returns 422)', async () => {
    // 1. Hold seats
    await app.request(`/v1/showtimes/${showtimeId}/hold`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ seatIds: ['screen-sb-1-B1', 'screen-sb-1-B2'] }),
    });

    const idemKey = `idem_${Date.now()}_${Math.random()}`;

    // 2. Create order first time
    const res1 = await app.request('/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'Idempotency-Key': idemKey,
      },
      body: JSON.stringify({ showtimeId }),
    });
    expect(res1.status).toBe(201);
    const body1 = (await res1.json()) as any;
    expect(body1.orderId).toBeTruthy();
    expect(body1.totalKobo).toBe(945000); // 2 standard (900000) + 45000 fee

    // 3. Replay with identical key and identical body -> MUST return exact same order
    const res2 = await app.request('/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'Idempotency-Key': idemKey,
      },
      body: JSON.stringify({ showtimeId }),
    });
    expect(res2.status).toBe(201);
    const body2 = (await res2.json()) as any;
    expect(body2.orderId).toBe(body1.orderId);
    expect(body2.reference).toBe(body1.reference);

    // 4. Replay with same key but DIFFERENT body -> MUST return 422 IDEMPOTENCY_CONFLICT
    const res3 = await app.request('/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'Idempotency-Key': idemKey,
      },
      body: JSON.stringify({ showtimeId: 'st-different' }),
    });
    expect(res3.status).toBe(422);
  });

  it('T9: Bad webhook signature rejected with 401; same event 3 times creates exactly one booking and ledger row', async () => {
    // Hold seats and create order
    await app.request(`/v1/showtimes/${showtimeId}/hold`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ seatIds: ['screen-sb-1-B3'] }),
    });

    const orderRes = await app.request('/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'Idempotency-Key': `idem_t9_${Date.now()}`,
      },
      body: JSON.stringify({ showtimeId }),
    });
    const { orderId, reference, totalKobo } = (await orderRes.json()) as any;

    const webhookPayload = JSON.stringify({
      event: 'charge.success',
      data: {
        id: `evt_t9_${Date.now()}`,
        reference,
        amount: totalKobo,
        status: 'success',
      },
    });

    // 1. Bad signature test -> 401
    const badSigRes = await app.request('/v1/webhooks/paystack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': 'invalid_signature_hex_12345',
      },
      body: webhookPayload,
    });
    expect(badSigRes.status).toBe(401);

    // Verify nothing written
    const badEventCheck = await pool.query('SELECT count(*) FROM webhook_events WHERE payload::text LIKE $1', [`%${reference}%`]);
    expect(parseInt(badEventCheck.rows[0].count, 10)).toBe(0);

    // 2. Valid signature test -> 200
    const validSignature = paystackClient.signPayload(webhookPayload);

    // Send the exact same event 3 times
    for (let i = 0; i < 3; i++) {
      const okRes = await app.request('/v1/webhooks/paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-paystack-signature': validSignature,
        },
        body: webhookPayload,
      });
      expect(okRes.status).toBe(200);
    }

    // Verify exactly 1 booking row exists
    const bookings = await pool.query('SELECT * FROM bookings WHERE order_id = $1', [orderId]);
    expect(bookings.rowCount).toBe(1);

    // Verify exactly 1 ledger charge row exists
    const ledger = await pool.query('SELECT * FROM ledger_entries WHERE order_id = $1', [orderId]);
    expect(ledger.rowCount).toBe(1);
    expect(ledger.rows[0].type).toBe('charge');
    expect(Number(ledger.rows[0].amount_kobo)).toBe(totalKobo);
  });

  it('T12: Late webhook policy (seats free means booked, seats taken means automatic full refund)', async () => {
    // 1. Late webhook with free seats -> Booked
    await app.request(`/v1/showtimes/${showtimeId}/hold`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ seatIds: ['screen-sb-1-B5'] }),
    });

    const o1 = await app.request('/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'Idempotency-Key': `idem_t12_free_${Date.now()}`,
      },
      body: JSON.stringify({ showtimeId }),
    });
    const order1 = (await o1.json()) as any;

    // Simulate hold expired in Redis
    await redis.flushdb();

    // Webhook arrives late
    const payload1 = JSON.stringify({
      event: 'charge.success',
      data: { reference: order1.reference, amount: order1.totalKobo },
    });
    const res1 = await app.request('/v1/webhooks/paystack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': paystackClient.signPayload(payload1),
      },
      body: payload1,
    });
    expect(res1.status).toBe(200);

    const bkg1 = await pool.query('SELECT * FROM bookings WHERE order_id = $1', [order1.orderId]);
    expect(bkg1.rowCount).toBe(1); // Free seat was successfully honored!

    // 2. Late webhook with TAKEN seats -> Automatic Refund
    await app.request(`/v1/showtimes/${showtimeId}/hold`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ seatIds: ['screen-sb-1-B6'] }),
    });

    const o2 = await app.request('/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'Idempotency-Key': `idem_t12_taken_${Date.now()}`,
      },
      body: JSON.stringify({ showtimeId }),
    });
    const order2 = (await o2.json()) as any;

    // Another user takes seat B6 directly in database
    await pool.query(
      `INSERT INTO bookings (id, showtime_id, seat_id, order_id, user_id, status, ticket_code)
       VALUES ('bkg_stealer', $1, 'screen-sb-1-B6', $2, 'usr_stealer', 'confirmed', 'tok_stealer')`,
      [showtimeId, order1.orderId],
    );

    // Now late webhook arrives for order 2 -> Must detect collision, mark unfulfilled & refund
    const payload2 = JSON.stringify({
      event: 'charge.success',
      data: { reference: order2.reference, amount: order2.totalKobo },
    });
    await app.request('/v1/webhooks/paystack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': paystackClient.signPayload(payload2),
      },
      body: payload2,
    });

    const ord2Check = await pool.query('SELECT status FROM orders WHERE id = $1', [order2.orderId]);
    expect(ord2Check.rows[0].status).toBe('refunded');

    // Verify charge and refund rows in ledger
    const led2 = await pool.query('SELECT type, amount_kobo FROM ledger_entries WHERE order_id = $1 ORDER BY created_at ASC', [order2.orderId]);
    expect(led2.rowCount).toBe(2);
    expect(led2.rows[0].type).toBe('charge');
    expect(led2.rows[1].type).toBe('refund');
  });

  it('T13: Failed payment webhook releases held seats immediately', async () => {
    await app.request(`/v1/showtimes/${showtimeId}/hold`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ seatIds: ['screen-sb-1-B7'] }),
    });

    const orderRes = await app.request('/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'Idempotency-Key': `idem_t13_${Date.now()}`,
      },
      body: JSON.stringify({ showtimeId }),
    });
    const { reference } = (await orderRes.json()) as any;

    // Send charge.failed webhook
    const failPayload = JSON.stringify({
      event: 'charge.failed',
      data: { reference },
    });
    await app.request('/v1/webhooks/paystack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': paystackClient.signPayload(failPayload),
      },
      body: failPayload,
    });

    // Seat B7 must be released in Redis immediately so another user can hold it
    const avail = await app.request(`/v1/showtimes/${showtimeId}/availability`);
    const availBody = (await avail.json()) as any;
    expect(availBody.heldSeatIds).not.toContain('screen-sb-1-B7');
  });

  it('T14: Cancelled showtime refunds every paid order once and writes ledger rows', async () => {
    // Complete booking for user
    await app.request(`/v1/showtimes/${showtimeId}/hold`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ seatIds: ['screen-sb-1-B8'] }),
    });

    const o = await app.request('/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'Idempotency-Key': `idem_t14_${Date.now()}`,
      },
      body: JSON.stringify({ showtimeId }),
    });
    const { orderId, reference, totalKobo } = (await o.json()) as any;

    const successPayload = JSON.stringify({
      event: 'charge.success',
      data: { reference, amount: totalKobo },
    });
    await app.request('/v1/webhooks/paystack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': paystackClient.signPayload(successPayload),
      },
      body: successPayload,
    });

    // Operator cancels showtime
    const opKey = env.OPERATOR_API_KEY;
    const cancelRes1 = await app.request(`/v1/operator/showtimes/${showtimeId}/cancel`, {
      method: 'POST',
      headers: { 'X-Operator-Key': opKey },
    });
    expect(cancelRes1.status).toBe(200);

    // Cancel second time (idempotency test)
    const cancelRes2 = await app.request(`/v1/operator/showtimes/${showtimeId}/cancel`, {
      method: 'POST',
      headers: { 'X-Operator-Key': opKey },
    });
    expect(cancelRes2.status).toBe(200);

    // Verify bookings marked cancelled
    const bkg = await pool.query('SELECT status FROM bookings WHERE order_id = $1', [orderId]);
    expect(bkg.rows[0].status).toBe('cancelled');

    // Verify refund ledger row written exactly once
    const refunds = await pool.query("SELECT * FROM ledger_entries WHERE order_id = $1 AND type = 'refund'", [orderId]);
    expect(refunds.rowCount).toBe(1);
    expect(Number(refunds.rows[0].amount_kobo)).toBe(totalKobo);
  });

  it('T17: Database trigger blocks UPDATE and DELETE on ledger_entries', async () => {
    const testId = `led_immutable_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const testKey = `key_imm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(
      `INSERT INTO ledger_entries (id, order_id, type, amount_kobo, currency, provider_ref, idempotency_key)
       VALUES ($1, 'ord_imm', 'charge', 500000, 'NGN', 'ref_imm', $2)`,
      [testId, testKey],
    );

    // UPDATE must fail
    await expect(
      pool.query(`UPDATE ledger_entries SET amount_kobo = 0 WHERE id = $1`, [testId]),
    ).rejects.toThrow(/append-only/i);

    // DELETE must fail
    await expect(
      pool.query(`DELETE FROM ledger_entries WHERE id = $1`, [testId]),
    ).rejects.toThrow(/append-only/i);
  });

  it('Ticket QR verification: valid token consumes ticket; second scan returns TICKET_ALREADY_USED', async () => {
    // Hold, order, pay
    await app.request(`/v1/showtimes/${showtimeId}/hold`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ seatIds: ['screen-sb-1-B9'] }),
    });

    const o = await app.request('/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'Idempotency-Key': `idem_qr_${Date.now()}`,
      },
      body: JSON.stringify({ showtimeId }),
    });
    const { orderId, reference, totalKobo } = (await o.json()) as any;

    const payload = JSON.stringify({
      event: 'charge.success',
      data: { reference, amount: totalKobo },
    });
    await app.request('/v1/webhooks/paystack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': paystackClient.signPayload(payload),
      },
      body: payload,
    });

    // Query order to get ticket token
    const ordCheck = await app.request(`/v1/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const { order } = (await ordCheck.json()) as any;
    expect(order.tickets.length).toBe(1);
    const token = order.tickets[0].token;

    // Operator verifies ticket (first scan -> 200 OK)
    const scan1 = await app.request('/v1/operator/tickets/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operator-Key': env.OPERATOR_API_KEY,
      },
      body: JSON.stringify({ token }),
    });
    expect(scan1.status).toBe(200);
    const scan1Body = (await scan1.json()) as any;
    expect(scan1Body.valid).toBe(true);

    // Second scan of the same ticket -> 409 TICKET_ALREADY_USED
    const scan2 = await app.request('/v1/operator/tickets/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operator-Key': env.OPERATOR_API_KEY,
      },
      body: JSON.stringify({ token }),
    });
    expect(scan2.status).toBe(409);
    const scan2Body = (await scan2.json()) as any;
    expect(scan2Body.error.code).toBe('TICKET_ALREADY_USED');
  });
});
