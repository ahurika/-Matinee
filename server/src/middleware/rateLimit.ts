import type { Context, MiddlewareHandler } from 'hono';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { redis } from '../lib/redis.js';
import { hit } from '../traffic/rateLimit.js';

export interface RateLimitOptions {
  limitUser?: number;
  limitIp?: number;
  windowMs?: number; // default 60_000 ms (1 minute)
  keyPrefix?: string;
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const windowMs = options.windowMs ?? 60_000;
  const prefix = options.keyPrefix ?? 'rl';

  return async (c: Context, next) => {
    // When LOADTEST_MODE is enabled in non-production, bypass hold rate limits so concurrency can be measured accurately
    if (env.LOADTEST_MODE && env.NODE_ENV !== 'production' && prefix.includes('hold')) {
      await next();
      return;
    }

    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
      c.req.header('x-real-ip') ||
      '127.0.0.1';

    // 1. IP rate limit check
    if (options.limitIp) {
      const ipKey = `${prefix}:ip:${ip}`;
      const res = await hit(redis, ipKey, options.limitIp, windowMs);
      c.header('X-RateLimit-Limit-IP', String(options.limitIp));
      c.header('X-RateLimit-Remaining-IP', String(res.remaining));

      if (!res.allowed) {
        c.header('Retry-After', String(res.retryAfterSec));
        throw new AppError(
          'RATE_LIMITED',
          `Too many requests from this IP. Please wait ${res.retryAfterSec} seconds.`,
          429,
        );
      }
    }

    // 2. User rate limit check (if authenticated)
    const user = c.get('user');
    if (options.limitUser && user?.id) {
      const userKey = `${prefix}:user:${user.id}`;
      const res = await hit(redis, userKey, options.limitUser, windowMs);
      c.header('X-RateLimit-Limit-User', String(options.limitUser));
      c.header('X-RateLimit-Remaining-User', String(res.remaining));

      if (!res.allowed) {
        c.header('Retry-After', String(res.retryAfterSec));
        throw new AppError(
          'RATE_LIMITED',
          `Rate limit exceeded. Please wait ${res.retryAfterSec} seconds.`,
          429,
        );
      }
    }

    await next();
  };
}
