import type { Redis } from 'ioredis';

// Cache-aside with a long-lived stale copy and single flight.
// fresh:{key}  lives for ttlSec.  stale:{key} lives for staleSec and is served only when the loader fails.
export type Cached<T> = { data: T; stale: boolean };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getCached<T>(
  redis: Redis,
  key: string,
  o: { ttlSec: number; staleSec: number; loader: () => Promise<T>; lockMs?: number; waitMs?: number },
): Promise<Cached<T>> {
  const fresh = await redis.get(`fresh:${key}`);
  if (fresh) return { data: JSON.parse(fresh) as T, stale: false };

  // Single flight: only one caller refreshes a cold key. The others wait briefly for the result.
  const gotLock = await redis.set(`lock:${key}`, '1', 'PX', o.lockMs ?? 10_000, 'NX');
  if (!gotLock) {
    const deadline = Date.now() + (o.waitMs ?? 2_000);
    while (Date.now() < deadline) {
      await sleep(50);
      const f = await redis.get(`fresh:${key}`);
      if (f) return { data: JSON.parse(f) as T, stale: false };
    }
    const s = await redis.get(`stale:${key}`);
    if (s) return { data: JSON.parse(s) as T, stale: true };
    // fall through and try ourselves
  }

  try {
    const data = await o.loader();
    const body = JSON.stringify(data);
    await redis.multi().set(`fresh:${key}`, body, 'EX', o.ttlSec).set(`stale:${key}`, body, 'EX', o.staleSec).exec();
    return { data, stale: false };
  } catch (err) {
    const s = await redis.get(`stale:${key}`);
    if (s) return { data: JSON.parse(s) as T, stale: true }; // TMDB is down, serve the last good copy
    throw err; // nothing to serve: the route maps this to MOVIES_UNAVAILABLE
  } finally {
    if (gotLock) await redis.del(`lock:${key}`);
  }
}
