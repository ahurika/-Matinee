import { Redis } from 'ioredis';

// Fixed window counter. INCR and PEXPIRE run as one atomic step so a crash cannot leave a key without an expiry.
const LUA = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return { c, ttl }
`;

type RL = Redis & { rateHit(n: number, ...a: (string | number)[]): Promise<[number, number]> };

export function registerRateLimit(redis: Redis) {
  redis.defineCommand('rateHit', { lua: LUA });
}

export async function hit(redis: Redis, key: string, limit: number, windowMs: number) {
  const [count, ttl] = await (redis as RL).rateHit(1, key, windowMs);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfterSec: Math.max(1, Math.ceil(ttl / 1000)) };
}
