import { redis } from '../lib/redis.js';
import {
  isActive,
  join,
  tick,
  wrKeys,
} from '../traffic/waitingRoom.js';

const CAPACITY = 300;
const RATE_PER_TICK = 20;
const ADMISSION_TTL_MS = 120 * 1000; // 120 seconds

export class WaitingRoomService {
  async join(showtimeId: string, userId: string) {
    const now = Date.now();
    const result = await join(redis, showtimeId, userId, now, ADMISSION_TTL_MS, CAPACITY);

    if (result.state === 'ACTIVE') {
      return {
        state: 'ACTIVE' as const,
        position: 0,
        estimatedWaitSec: 0,
      };
    }

    const position = result.position ?? 1;
    const estimatedWaitSec = Math.ceil(position / RATE_PER_TICK);

    return {
      state: 'QUEUED' as const,
      position,
      estimatedWaitSec,
    };
  }

  async getStatus(showtimeId: string, userId: string) {
    const active = await isActive(redis, showtimeId, userId, Date.now());
    if (active) {
      return {
        state: 'ACTIVE' as const,
        position: 0,
        estimatedWaitSec: 0,
      };
    }

    const rank = await redis.zrank(wrKeys(showtimeId).queue, userId);
    if (rank !== null) {
      const position = rank + 1;
      const estimatedWaitSec = Math.ceil(position / RATE_PER_TICK);
      return {
        state: 'QUEUED' as const,
        position,
        estimatedWaitSec,
      };
    }

    return {
      state: 'NOT_QUEUED' as const,
      position: 0,
      estimatedWaitSec: 0,
    };
  }

  async tick(showtimeId: string) {
    return tick(redis, showtimeId, {
      now: Date.now(),
      capacity: CAPACITY,
      ratePerTick: RATE_PER_TICK,
      activeTtlMs: ADMISSION_TTL_MS,
    });
  }
}

export const waitingRoomService = new WaitingRoomService();
