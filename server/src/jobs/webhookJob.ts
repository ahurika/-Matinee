import crypto from 'node:crypto';
import { pool } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { releaseSeats, soldKey, versionKey } from '../seats/redisHolds.js';
import { ticketService } from '../services/ticketService.js';

export async function processWebhookEvent(payload: any): Promise<void> {
  const event = payload.event;
  const ref = payload.data?.reference;
  if (!ref) return;

  const client = await pool.connect();

  try {
    if (event === 'charge.success') {
      await client.query('BEGIN');

      const { rows: attempts } = await client.query<{
        id: string;
        order_id: string;
        amount_kobo: string;
        status: string;
      }>(
        `SELECT id, order_id, amount_kobo, status
         FROM payment_attempts
         WHERE provider_ref = $1
         FOR UPDATE`,
        [ref],
      );

      if (attempts.length === 0) {
        await client.query('COMMIT');
        return;
      }

      const attempt = attempts[0];
      if (attempt.status === 'succeeded') {
        // Idempotent duplicate: already processed
        await client.query('COMMIT');
        return;
      }

      const paidAmount = Number(payload.data.amount);
      if (Number(attempt.amount_kobo) !== paidAmount) {
        await client.query(
          `UPDATE payment_attempts SET status = 'amount_mismatch' WHERE id = $1`,
          [attempt.id],
        );
        await client.query('COMMIT');
        return;
      }

      const { rows: orders } = await client.query<{
        id: string;
        user_id: string;
        showtime_id: string;
        currency: string;
        hold_id: string;
      }>(`SELECT id, user_id, showtime_id, currency, hold_id FROM orders WHERE id = $1`, [
        attempt.order_id,
      ]);

      const order = orders[0];
      const { rows: orderSeats } = await client.query<{ seat_id: string }>(
        `SELECT seat_id FROM order_seats WHERE order_id = $1`,
        [order.id],
      );

      // Attempt booking insertions
      const insertedSeatIds: string[] = [];
      for (const os of orderSeats) {
        const bookingId = `bkg_${crypto.randomUUID()}`;
        const ticketCode = ticketService.generateTicketToken(bookingId, order.showtime_id, os.seat_id);

        const res = await client.query<{ seat_id: string }>(
          `INSERT INTO bookings (id, showtime_id, seat_id, order_id, user_id, status, ticket_code)
           VALUES ($1, $2, $3, $4, $5, 'confirmed', $6)
           ON CONFLICT (showtime_id, seat_id) DO NOTHING
           RETURNING seat_id`,
          [bookingId, order.showtime_id, os.seat_id, order.id, order.user_id, ticketCode],
        );

        if (res.rowCount && res.rowCount > 0) {
          insertedSeatIds.push(res.rows[0].seat_id);
        }
      }

      // Check if all seats won
      if (insertedSeatIds.length === orderSeats.length) {
        // Happy path
        await client.query(
          `UPDATE orders SET status = 'paid', updated_at = now() WHERE id = $1`,
          [order.id],
        );
        await client.query(
          `UPDATE payment_attempts SET status = 'succeeded' WHERE id = $1`,
          [attempt.id],
        );

        // Immutable ledger charge row
        await client.query(
          `INSERT INTO ledger_entries (id, order_id, type, amount_kobo, currency, provider_ref, idempotency_key)
           VALUES ($1, $2, 'charge', $3, $4, $5, $6)
           ON CONFLICT (idempotency_key) DO NOTHING`,
          [
            `led_${crypto.randomUUID()}`,
            order.id,
            paidAmount,
            order.currency,
            ref,
            `charge:${order.id}`,
          ],
        );

        await client.query('COMMIT');

        // Post-commit Redis synchronization
        try {
          const seatIds = orderSeats.map((s) => s.seat_id);
          await redis.sadd(soldKey(order.showtime_id), ...seatIds);
          await releaseSeats(redis, {
            showtimeId: order.showtime_id,
            seatIds,
            holdId: order.hold_id,
          });
          await redis.incr(versionKey(order.showtime_id));
        } catch {}
      } else {
        // LATE WEBHOOK CASE: seats were taken after hold expired!
        await client.query('ROLLBACK');

        // Execute unfulfilled & refund recording in fresh transaction
        await client.query('BEGIN');
        await client.query(
          `UPDATE orders SET status = 'paid_unfulfilled', updated_at = now() WHERE id = $1`,
          [order.id],
        );
        await client.query(
          `UPDATE payment_attempts SET status = 'late_unfulfilled' WHERE id = $1`,
          [attempt.id],
        );

        // Record charge and automatic full refund in the ledger
        await client.query(
          `INSERT INTO ledger_entries (id, order_id, type, amount_kobo, currency, provider_ref, idempotency_key)
           VALUES ($1, $2, 'charge', $3, $4, $5, $6)
           ON CONFLICT (idempotency_key) DO NOTHING`,
          [
            `led_${crypto.randomUUID()}`,
            order.id,
            paidAmount,
            order.currency,
            ref,
            `charge:${order.id}`,
          ],
        );

        await client.query(
          `INSERT INTO ledger_entries (id, order_id, type, amount_kobo, currency, provider_ref, idempotency_key)
           VALUES ($1, $2, 'refund', $3, $4, $5, $6)
           ON CONFLICT (idempotency_key) DO NOTHING`,
          [
            `led_${crypto.randomUUID()}`,
            order.id,
            paidAmount,
            order.currency,
            ref,
            `refund:${order.id}`,
          ],
        );

        await client.query(
          `UPDATE orders SET status = 'refunded', updated_at = now() WHERE id = $1`,
          [order.id],
        );

        await client.query('COMMIT');
        console.warn(`[LateWebhookRefunded] Order=${order.id} seats were taken. Issued automatic refund.`);
      }
    } else if (event === 'charge.failed') {
      // Failed payment releases held seats immediately (Proof test T13)
      await client.query('BEGIN');

      const { rows: attempts } = await client.query<{ id: string; order_id: string }>(
        `SELECT id, order_id FROM payment_attempts WHERE provider_ref = $1 FOR UPDATE`,
        [ref],
      );

      if (attempts.length > 0) {
        const attempt = attempts[0];
        await client.query(
          `UPDATE payment_attempts SET status = 'failed' WHERE id = $1`,
          [attempt.id],
        );
        await client.query(
          `UPDATE orders SET status = 'failed', updated_at = now() WHERE id = $1`,
          [attempt.order_id],
        );

        const { rows: orders } = await client.query<{ showtime_id: string; hold_id: string }>(
          `SELECT showtime_id, hold_id FROM orders WHERE id = $1`,
          [attempt.order_id],
        );

        if (orders.length > 0) {
          const order = orders[0];
          const { rows: orderSeats } = await client.query<{ seat_id: string }>(
            `SELECT seat_id FROM order_seats WHERE order_id = $1`,
            [attempt.order_id],
          );

          await client.query('COMMIT');

          // Release seats immediately so others can take them
          try {
            await releaseSeats(redis, {
              showtimeId: order.showtime_id,
              seatIds: orderSeats.map((s) => s.seat_id),
              holdId: order.hold_id,
            });
          } catch {}
          return;
        }
      }

      await client.query('COMMIT');
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
