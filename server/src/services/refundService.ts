import crypto from 'node:crypto';
import { pool } from '../lib/db.js';

export class RefundService {
  async cancelShowtimeAndRefund(showtimeId: string): Promise<{ refundedOrders: number }> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Mark showtime cancelled
      await client.query(
        `UPDATE showtimes SET status = 'cancelled' WHERE id = $1`,
        [showtimeId],
      );

      // 2. Find all paid orders for this showtime
      const { rows: paidOrders } = await client.query<{
        id: string;
        total_kobo: string;
        currency: string;
      }>(
        `SELECT id, total_kobo, currency
         FROM orders
         WHERE showtime_id = $1 AND status = 'paid'
         FOR UPDATE`,
        [showtimeId],
      );

      let count = 0;
      for (const order of paidOrders) {
        const idempotencyKey = `refund:${order.id}`;

        // Insert refund row into append-only ledger
        const ledgerRes = await client.query(
          `INSERT INTO ledger_entries (id, order_id, type, amount_kobo, currency, provider_ref, idempotency_key)
           VALUES ($1, $2, 'refund', $3, $4, $5, $6)
           ON CONFLICT (idempotency_key) DO NOTHING
           RETURNING id`,
          [
            `led_${crypto.randomUUID()}`,
            order.id,
            Number(order.total_kobo),
            order.currency,
            `refund_ref_${order.id}`,
            idempotencyKey,
          ],
        );

        if (ledgerRes.rowCount && ledgerRes.rowCount > 0) {
          count++;
        }

        // Update bookings and order status
        await client.query(
          `UPDATE bookings SET status = 'cancelled' WHERE order_id = $1`,
          [order.id],
        );
        await client.query(
          `UPDATE orders SET status = 'refunded', updated_at = now() WHERE id = $1`,
          [order.id],
        );
      }

      await client.query('COMMIT');
      return { refundedOrders: count };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export const refundService = new RefundService();
