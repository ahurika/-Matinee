import crypto from 'node:crypto';
import { priceOrder } from '../config/pricing.js';
import { paystackClient } from '../integrations/paystack/paystackClient.js';
import { pool } from '../lib/db.js';
import { AppError } from '../lib/errors.js';
import { redis } from '../lib/redis.js';
import { idempotencyRepository } from '../repositories/idempotencyRepository.js';
import { showtimeRepository } from '../repositories/showtimeRepository.js';
import { extendSeats } from '../seats/redisHolds.js';
import { type HoldSession } from './holdService.js';
import { ticketService } from './ticketService.js';

const PAYMENT_GRACE_MS = 7 * 60 * 1000; // 7 minutes payment grace

export class OrderService {
  async createOrder(p: {
    userId: string;
    showtimeId: string;
    idempotencyKey: string;
    requestBody: unknown;
    userEmail: string;
  }) {
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(p.requestBody))
      .digest('hex');

    // 1. Idempotency acquisition
    const acq = await idempotencyRepository.acquire({
      userId: p.userId,
      key: p.idempotencyKey,
      requestHash,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    });

    if (acq.status === 'CONFLICT') {
      throw new AppError(
        'VALIDATION_ERROR',
        'Idempotency key conflict: request payload differs from previous request with same key',
        422,
      );
    }

    if (acq.status === 'IN_PROGRESS') {
      throw new AppError(
        'IDEMPOTENCY_IN_FLIGHT',
        'A request with this idempotency key is already processing',
        409,
      );
    }

    if (acq.status === 'COMPLETED') {
      return acq.responseBody;
    }

    // 2. Validate hold session
    const sessionKey = `holdsession:${p.showtimeId}:${p.userId}`;
    const sessionRaw = await redis.get(sessionKey);
    if (!sessionRaw) {
      throw new AppError(
        'HOLD_EXPIRED',
        'Your seat hold has expired. Please select your seats again.',
        409,
      );
    }

    const session = JSON.parse(sessionRaw) as HoldSession;
    if (session.seatIds.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'No seats currently held', 400);
    }

    // 3. Read seats and kinds from DB (never trust frontend)
    const { rows: seatRows } = await pool.query<{ id: string; kind: 'standard' | 'premium' | 'wheelchair' }>(
      `SELECT id, kind FROM seats WHERE id = ANY($1::text[])`,
      [session.seatIds],
    );

    if (seatRows.length !== session.seatIds.length) {
      throw new AppError('VALIDATION_ERROR', 'One or more held seats are invalid', 400);
    }

    const kinds = seatRows.map((s) => s.kind);
    const pricing = priceOrder(kinds);

    const orderId = `ord_${crypto.randomUUID()}`;
    const providerRef = `ref_${crypto.randomUUID()}`;
    const holdExpiresAt = new Date(Date.now() + PAYMENT_GRACE_MS);

    // 4. Begin DB transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO orders (
           id, user_id, showtime_id, status, subtotal_kobo, fee_kobo, total_kobo,
           currency, hold_id, hold_expires_at, idempotency_key
         ) VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10)`,
        [
          orderId,
          p.userId,
          p.showtimeId,
          pricing.subtotalKobo,
          pricing.feeKobo,
          pricing.totalKobo,
          pricing.currency,
          session.holdId,
          holdExpiresAt,
          p.idempotencyKey,
        ],
      );

      for (const seat of seatRows) {
        const seatPrice = seat.kind === 'premium' ? 650000 : 450000;
        await client.query(
          `INSERT INTO order_seats (order_id, seat_id, price_kobo)
           VALUES ($1, $2, $3)`,
          [orderId, seat.id, seatPrice],
        );
      }

      await client.query(
        `INSERT INTO payment_attempts (id, order_id, provider_ref, amount_kobo, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [`att_${crypto.randomUUID()}`, orderId, providerRef, pricing.totalKobo],
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // 5. Payment grace extension in Redis (at least 7 minutes)
    try {
      await extendSeats(redis, {
        showtimeId: p.showtimeId,
        seatIds: session.seatIds,
        holdId: session.holdId,
        ttlMs: PAYMENT_GRACE_MS,
      });
      // Update session expiry in Redis
      session.expiresAt = holdExpiresAt.getTime();
      await redis.set(sessionKey, JSON.stringify(session), 'PX', PAYMENT_GRACE_MS);
    } catch {}

    // 6. Initialize Paystack checkout
    const checkout = await paystackClient.initializeTransaction({
      email: p.userEmail,
      amountKobo: pricing.totalKobo,
      reference: providerRef,
      metadata: { orderId, showtimeId: p.showtimeId },
    });

    const response = {
      orderId,
      checkoutUrl: checkout.checkoutUrl,
      reference: providerRef,
      expiresAt: holdExpiresAt.toISOString(),
      subtotalKobo: pricing.subtotalKobo,
      feeKobo: pricing.feeKobo,
      totalKobo: pricing.totalKobo,
      currency: pricing.currency,
      seatIds: session.seatIds,
    };

    // 7. Save completed response for idempotency replay
    await idempotencyRepository.saveResponse({
      userId: p.userId,
      key: p.idempotencyKey,
      responseStatus: 201,
      responseBody: response,
    });

    return response;
  }

  async getOrder(orderId: string, userId: string) {
    const { rows } = await pool.query<{
      id: string;
      user_id: string;
      showtime_id: string;
      status: string;
      subtotal_kobo: string;
      fee_kobo: string;
      total_kobo: string;
      currency: string;
      hold_expires_at: Date;
      created_at: Date;
    }>(
      `SELECT id, user_id, showtime_id, status, subtotal_kobo, fee_kobo, total_kobo,
              currency, hold_expires_at, created_at
       FROM orders
       WHERE id = $1 AND user_id = $2`,
      [orderId, userId],
    );

    if (rows.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Order not found', 404);
    }

    const order = rows[0];
    const showtime = await showtimeRepository.getShowtime(order.showtime_id);

    const { rows: seatRows } = await pool.query<{
      seat_id: string;
      price_kobo: string;
      row_label: string;
      number: number;
      kind: string;
    }>(
      `SELECT os.seat_id, os.price_kobo, s.row_label, s.number, s.kind
       FROM order_seats os
       JOIN seats s ON s.id = os.seat_id
       WHERE os.order_id = $1`,
      [orderId],
    );

    // If paid, attach tickets with signed QR tokens
    let tickets: { bookingId: string; seatId: string; token: string }[] = [];
    if (order.status === 'paid') {
      const { rows: bookingRows } = await pool.query<{
        id: string;
        showtime_id: string;
        seat_id: string;
      }>(
        `SELECT id, showtime_id, seat_id FROM bookings WHERE order_id = $1`,
        [orderId],
      );
      tickets = bookingRows.map((b) => ({
        bookingId: b.id,
        seatId: b.seat_id,
        token: ticketService.generateTicketToken(b.id, b.showtime_id, b.seat_id),
      }));
    }

    return {
      order: {
        id: order.id,
        status: order.status,
        subtotalKobo: Number(order.subtotal_kobo),
        feeKobo: Number(order.fee_kobo),
        totalKobo: Number(order.total_kobo),
        currency: order.currency,
        holdExpiresAt: order.hold_expires_at.toISOString(),
        createdAt: order.created_at.toISOString(),
        showtime,
        seats: seatRows,
        tickets,
      },
    };
  }
}

export const orderService = new OrderService();
