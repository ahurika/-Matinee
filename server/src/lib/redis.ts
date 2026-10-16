import { Redis } from 'ioredis';
import { env } from '../config/env.js';

import { registerScripts } from '../seats/redisHolds.js';
import { registerRateLimit } from '../traffic/rateLimit.js';
import { registerWaitingRoom } from '../traffic/waitingRoom.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

registerScripts(redis);
registerWaitingRoom(redis);
registerRateLimit(redis);
