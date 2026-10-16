import { Hono } from 'hono';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { redis } from '../lib/redis.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { showtimeRepository } from '../repositories/showtimeRepository.js';
import { readAvailability, versionKey } from '../seats/redisHolds.js';
import { holdService } from '../services/holdService.js';
import { waitingRoomService } from '../services/waitingRoomService.js';

export const showtimesRoute = new Hono();

const holdBodySchema = z.object({
  seatIds: z.array(z.string().min(1)).min(1).max(8),
});

const waitingRoomJoinSchema = z.object({
  deviceId: z.string().optional(),
});

// 1. Showtime detail
showtimesRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const showtime = await showtimeRepository.getShowtime(id);
  if (!showtime) {
    throw new AppError('SHOWTIME_NOT_FOUND', 'Showtime not found', 404);
  }
  return c.json({ showtime }, 200);
});

// 2. Static seat map layout (cached in Redis 1 hour)
showtimesRoute.get('/:id/seatmap', async (c) => {
  const id = c.req.param('id');
  const showtime = await showtimeRepository.getShowtime(id);
  if (!showtime) {
    throw new AppError('SHOWTIME_NOT_FOUND', 'Showtime not found', 404);
  }

  const cacheKey = `fresh:seatmap:${showtime.screen_id}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return c.json(JSON.parse(cached), 200);
  }

  const seats = await showtimeRepository.getSeatsForScreen(showtime.screen_id);
  const layout = {
    screenId: showtime.screen_id,
    screenName: showtime.screen_name,
    cinemaName: showtime.cinema_name,
    seats,
  };

  await redis.set(cacheKey, JSON.stringify(layout), 'EX', 3600);
  return c.json(layout, 200);
});

// 3. Near real-time availability with ETag and 304 (T18)
showtimesRoute.get(
  '/:id/availability',
  rateLimit({ limitUser: 30, limitIp: 300, keyPrefix: 'rl:avail' }),
  async (c) => {
    const st = c.req.param('id');
    const ifNoneMatch = c.req.header('if-none-match');

    // 1. Check current version
    const rawVersion = await redis.get(versionKey(st));
    const version = Number(rawVersion ?? 0);
    const etag = `v${version}`;

    if (ifNoneMatch && ifNoneMatch.replace(/["w/]/gi, '') === etag) {
      c.header('ETag', `"${etag}"`);
      c.header('Cache-Control', 'no-cache');
      return c.body(null, 304);
    }

    // 2. Read availability (held seat IDs and sold seat IDs)
    const { held, sold } = await readAvailability(redis, st);

    c.header('ETag', `"${etag}"`);
    c.header('Cache-Control', 'no-cache');
    return c.json(
      {
        showtimeId: st,
        heldSeatIds: held,
        soldSeatIds: sold,
        version,
      },
      200,
    );
  },
);

// 4. Waiting room join
showtimesRoute.get(
  '/:id/waiting-room/status',
  async (c) => {
    const showtimeId = c.req.param('id');
    const user = c.get('user');
    const userId = user?.id || c.req.query('deviceId') || 'anonymous';
    const status = await waitingRoomService.getStatus(showtimeId, userId);
    return c.json(status, 200);
  },
);

showtimesRoute.post(
  '/:id/waiting-room/join',
  rateLimit({ limitUser: 10, limitIp: 60, keyPrefix: 'rl:wr' }),
  async (c) => {
    const showtimeId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const parsed = waitingRoomJoinSchema.parse(body);

    const user = c.get('user');
    const userId = user?.id || parsed.deviceId || 'anonymous';

    const result = await waitingRoomService.join(showtimeId, userId);
    return c.json(result, 200);
  },
);

// 5. Atomic Seat Holds (PUT replaces selection)
showtimesRoute.put(
  '/:id/hold',
  requireAuth,
  rateLimit({ limitUser: 20, limitIp: 120, keyPrefix: 'rl:hold' }),
  async (c) => {
    const showtimeId = c.req.param('id');
    const user = c.get('user');
    const body = await c.req.json();
    const parsed = holdBodySchema.parse(body);

    const result = await holdService.holdSeats({
      showtimeId,
      seatIds: parsed.seatIds,
      userId: user.id,
    });

    return c.json(result, 200);
  },
);

// 6. Release Hold
showtimesRoute.delete(
  '/:id/hold',
  requireAuth,
  rateLimit({ limitUser: 20, limitIp: 120, keyPrefix: 'rl:hold' }),
  async (c) => {
    const showtimeId = c.req.param('id');
    const user = c.get('user');

    const result = await holdService.releaseHold({
      showtimeId,
      userId: user.id,
    });

    return c.json(result, 200);
  },
);
