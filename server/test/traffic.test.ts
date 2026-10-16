import { Redis } from 'ioredis';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { hit, registerRateLimit } from '../src/traffic/rateLimit.js';
import { isActive, join, registerWaitingRoom, tick } from '../src/traffic/waitingRoom.js';

const redis = new Redis(process.env.REDIS_URL!);
registerWaitingRoom(redis);
registerRateLimit(redis);
const ST = 'st-1';
beforeEach(async () => { await redis.flushdb(); });
afterAll(async () => { await redis.quit(); });

describe('waiting room', () => {
  it('1000 users arrive at once: 100 walk in, 900 queue with unique ordered positions', async () => {
    const now = 1_000_000;
    const results = await Promise.all(Array.from({ length: 1000 }, (_, i) => join(redis, ST, `u${i}`, now, 60000, 100)));
    expect(results.filter((r) => r.state === 'ACTIVE').length).toBe(100);
    const positions = results.filter((r) => r.state === 'QUEUED').map((r) => r.position).sort((a, b) => a - b);
    expect(positions.length).toBe(900);
    expect(positions[0]).toBe(1);
    expect(positions[899]).toBe(900);
    expect(new Set(positions).size).toBe(900);
    expect(await redis.zcard(`wr:active:{${ST}}`)).toBe(100);
  });

  it('a full room admits nobody until admissions expire, then admits at a fixed rate in join order', async () => {
    const now = 2_000_000;
    const results: { u: string; state: string; position: number }[] = [];
    for (let i = 0; i < 300; i++) results.push({ u: `u${i}`, ...(await join(redis, ST, `u${i}`, now + i, 60000, 100)) });
    expect((await tick(redis, ST, { now: now + 1000, capacity: 100, ratePerTick: 25, activeTtlMs: 60000 })).length).toBe(0);

    const later = now + 61_000; // first admissions have expired
    const batches: string[][] = [];
    for (let t = 0; t < 4; t++) batches.push(await tick(redis, ST, { now: later + t * 1000, capacity: 100, ratePerTick: 25, activeTtlMs: 60000 }));
    expect(batches.map((b) => b.length)).toEqual([25, 25, 25, 25]); // steady rate, not a stampede
    expect(await redis.zcard(`wr:active:{${ST}}`)).toBeLessThanOrEqual(100);
    const admittedUsers = batches.flat();
    const expected = results.filter((r) => r.state === 'QUEUED').sort((a, b) => a.position - b.position).slice(0, 100).map((r) => r.u);
    expect(admittedUsers).toEqual(expected); // first come, first served
  });

  it('capacity is never exceeded even with many ticks', async () => {
    const now = 3_000_000;
    for (let i = 0; i < 500; i++) await join(redis, ST, `u${i}`, now, 600000, 50);
    for (let t = 0; t < 20; t++) await tick(redis, ST, { now: now + t * 1000, capacity: 50, ratePerTick: 25, activeTtlMs: 600000 });
    expect(await redis.zcard(`wr:active:{${ST}}`)).toBe(50);
  });

  it('joining twice keeps the same place, and a heartbeat extends an active admission', async () => {
    const now = 9_000_000;
    for (let i = 0; i < 3; i++) await join(redis, ST, `fill${i}`, now, 1000, 3); // fill the room
    const a = await join(redis, ST, 'alice', now, 1000, 3);
    expect(a.state).toBe('QUEUED');
    const again = await join(redis, ST, 'alice', now + 10, 1000, 3);
    expect(again.position).toBe(a.position);
    await join(redis, ST, 'fill0', now + 800, 1000, 3); // heartbeat for fill0
    expect(await isActive(redis, ST, 'fill0', now + 1500)).toBe(true);
    expect(await isActive(redis, ST, 'fill1', now + 1500)).toBe(false);
  });
});

describe('rate limiter', () => {
  it('allows the limit, blocks after it, and resets after the window', async () => {
    const out = [];
    for (let i = 0; i < 7; i++) out.push(await hit(redis, 'rl:hold:user1', 5, 300));
    expect(out.map((o) => o.allowed)).toEqual([true, true, true, true, true, false, false]);
    expect(out[5]!.retryAfterSec).toBeGreaterThanOrEqual(1);
    await new Promise((r) => setTimeout(r, 400));
    expect((await hit(redis, 'rl:hold:user1', 5, 300)).allowed).toBe(true);
  });

  it('stays exact under 500 parallel hits and counts keys independently', async () => {
    const r = await Promise.all(Array.from({ length: 500 }, () => hit(redis, 'rl:ip:1.2.3.4', 100, 60000)));
    expect(r.filter((x) => x.allowed).length).toBe(100);
    expect((await hit(redis, 'rl:ip:5.6.7.8', 100, 60000)).allowed).toBe(true);
  });
});
