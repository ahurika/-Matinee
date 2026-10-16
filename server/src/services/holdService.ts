import crypto from 'node:crypto';
import { pool } from '../lib/db.js';
import { AppError } from '../lib/errors.js';
import { redis } from '../lib/redis.js';
import { showtimeRepository } from '../repositories/showtimeRepository.js';
import { holdSeatsInDb } from '../seats/dbHolds.js';
import { holdSeats, releaseSeats } from '../seats/redisHolds.js';
import { wrKeys } from '../traffic/waitingRoom.js';

const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export interface HoldSession {
  holdId: string;
  expiresAt: number;
  seatIds: string[];
}

export class HoldService {
  async holdSeats(p: { showtimeId: string; seatIds: string[]; userId: string }) {
    const showtime = await showtimeRepository.getShowtime(p.showtimeId);
    if (!showtime) {
      throw new AppError('SHOWTIME_NOT_FOUND', 'Showtime not found', 404);
    }

    if (showtime.status === 'cancelled') {
      throw new AppError('SHOWTIME_CANCELLED', 'This showtime has been cancelled', 400);
    }

    if (new Date(showtime.booking_opens_at).getTime() > Date.now()) {
      throw new AppError('SHOWTIME_NOT_OPEN', 'Booking for this showtime is not open yet', 400);
    }

    const uniqueSeatIds = Array.from(new Set(p.seatIds));
    if (uniqueSeatIds.length === 0 || uniqueSeatIds.length > 8) {
      throw new AppError(
        'VALIDATION_ERROR',
        'You can hold between 1 and 8 seats per order',
        400,
        { seatIds: ['Must select between 1 and 8 seats'] },
      );
    }

    // Validate that all seats exist for this screen
    const validSeats = await showtimeRepository.getSeatsForScreen(showtime.screen_id);
    const validSeatIdSet = new Set(validSeats.map((s) => s.id));
    for (const sid of uniqueSeatIds) {
      if (!validSeatIdSet.has(sid)) {
        throw new AppError('VALIDATION_ERROR', `Seat ${sid} does not exist in this auditorium`, 400);
      }
    }

    const sessionKey = `holdsession:${p.showtimeId}:${p.userId}`;
    const sessionRaw = await redis.get(sessionKey);
    let holdId: string;
    let expiresAt: number;
    let oldSeats: string[] = [];

    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw) as HoldSession;
      holdId = parsed.holdId;
      expiresAt = parsed.expiresAt;
      oldSeats = parsed.seatIds || [];
    } else {
      holdId = `hld_${crypto.randomUUID()}`;
      expiresAt = Date.now() + HOLD_DURATION_MS;
    }

    let ttlMs = expiresAt - Date.now();
    if (ttlMs <= 0) {
      expiresAt = Date.now() + HOLD_DURATION_MS;
      ttlMs = HOLD_DURATION_MS;
    }

    const seatsToAdd = uniqueSeatIds.filter((s) => !oldSeats.includes(s));
    const seatsToRemove = oldSeats.filter((s) => !uniqueSeatIds.includes(s));

    // Atomic hold via Redis Lua
    if (seatsToAdd.length > 0) {
      try {
        const result = await holdSeats(redis, {
          showtimeId: p.showtimeId,
          seatIds: seatsToAdd,
          holdId,
          ttlMs,
        });

        if (!result.ok) {
          throw new AppError(
            'SEAT_TAKEN',
            `Seat ${result.seatId} is already taken`,
            409,
            { seatIds: [result.seatId] },
          );
        }
      } catch (err) {
        if (err instanceof AppError) throw err;

        // Redis outage fallback: execute hold transaction in PostgreSQL
        console.warn(`[RedisOutageFallback] Falling back to Postgres for showtime=${p.showtimeId}`);
        const dbSuccess = await holdSeatsInDb(pool, {
          showtimeId: p.showtimeId,
          seatIds: seatsToAdd,
          holdId,
          ttlMs,
        });

        if (!dbSuccess) {
          throw new AppError('SEAT_TAKEN', 'One or more requested seats are unavailable', 409);
        }
      }
    }

    // Release deselected seats
    if (seatsToRemove.length > 0) {
      try {
        await releaseSeats(redis, {
          showtimeId: p.showtimeId,
          seatIds: seatsToRemove,
          holdId,
        });
      } catch {}
    }

    // Save session in Redis
    try {
      await redis.set(
        sessionKey,
        JSON.stringify({ holdId, expiresAt, seatIds: uniqueSeatIds }),
        'PX',
        ttlMs,
      );
      // Keep waiting room admission active during hold
      await redis.zadd(wrKeys(p.showtimeId).active, Date.now() + 120_000, p.userId);
    } catch {}

    return {
      holdId,
      expiresAt: new Date(expiresAt).toISOString(),
      serverNow: new Date().toISOString(),
      seatIds: uniqueSeatIds,
    };
  }

  async releaseHold(p: { showtimeId: string; userId: string }) {
    const sessionKey = `holdsession:${p.showtimeId}:${p.userId}`;
    const sessionRaw = await redis.get(sessionKey);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw) as HoldSession;
      await releaseSeats(redis, {
        showtimeId: p.showtimeId,
        seatIds: parsed.seatIds,
        holdId: parsed.holdId,
      });
      await redis.del(sessionKey);
    }
    return { success: true };
  }
}

export const holdService = new HoldService();
