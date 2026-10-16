import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { pool } from '../lib/db.js';
import { AppError } from '../lib/errors.js';

export interface VerifyTicketResult {
  valid: boolean;
  bookingId: string;
  showtimeId: string;
  seatId: string;
  usedAt?: Date | null;
  message?: string;
}

export class TicketService {
  private secret = env.TICKET_SIGNING_SECRET;

  generateTicketToken(bookingId: string, showtimeId: string, seatId: string): string {
    const payload = `${bookingId}:${showtimeId}:${seatId}`;
    const sig = crypto.createHmac('sha256', this.secret).update(payload).digest('base64url');
    const idB64 = Buffer.from(bookingId).toString('base64url');
    return `${idB64}.${sig}`;
  }

  async verifyAndConsumeTicket(token: string): Promise<VerifyTicketResult> {
    const parts = token.split('.');
    if (parts.length !== 2) {
      throw new AppError('TICKET_INVALID', 'Malformed ticket token', 400);
    }

    const [idB64, providedSig] = parts;
    const bookingId = Buffer.from(idB64, 'base64url').toString('utf8');

    // Load booking from database
    const { rows } = await pool.query<{
      id: string;
      showtime_id: string;
      seat_id: string;
      status: string;
      used_at: Date | null;
      showtime_status: string;
    }>(
      `SELECT b.id, b.showtime_id, b.seat_id, b.status, b.used_at, st.status AS showtime_status
       FROM bookings b
       JOIN showtimes st ON st.id = b.showtime_id
       WHERE b.id = $1`,
      [bookingId],
    );

    if (rows.length === 0) {
      throw new AppError('TICKET_INVALID', 'Booking not found', 404);
    }

    const booking = rows[0];

    // Cryptographic signature check (timing safe)
    const expectedPayload = `${booking.id}:${booking.showtime_id}:${booking.seat_id}`;
    const expectedSig = crypto.createHmac('sha256', this.secret).update(expectedPayload).digest('base64url');

    const provBuf = Buffer.from(providedSig);
    const expBuf = Buffer.from(expectedSig);
    if (provBuf.length !== expBuf.length || !crypto.timingSafeEqual(provBuf, expBuf)) {
      throw new AppError('TICKET_INVALID', 'Invalid ticket cryptographic signature', 400);
    }

    if (booking.showtime_status === 'cancelled') {
      throw new AppError('SHOWTIME_CANCELLED', 'This showtime was cancelled and refunded', 400);
    }

    if (booking.status !== 'confirmed') {
      throw new AppError('TICKET_INVALID', `Ticket is not valid (status: ${booking.status})`, 400);
    }

    // Replay check: already scanned
    if (booking.used_at !== null) {
      throw new AppError(
        'TICKET_ALREADY_USED',
        `Ticket already scanned at ${booking.used_at.toISOString()}`,
        409,
      );
    }

    // Atomic consumption
    const updateRes = await pool.query(
      `UPDATE bookings
       SET used_at = now()
       WHERE id = $1 AND used_at IS NULL
       RETURNING used_at`,
      [booking.id],
    );

    if (updateRes.rowCount === 0) {
      throw new AppError('TICKET_ALREADY_USED', 'Ticket was just scanned by another operator', 409);
    }

    return {
      valid: true,
      bookingId: booking.id,
      showtimeId: booking.showtime_id,
      seatId: booking.seat_id,
      usedAt: updateRes.rows[0].used_at,
    };
  }
}

export const ticketService = new TicketService();
