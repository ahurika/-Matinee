import { Redis } from 'ioredis';
import { EXTEND_SEATS_LUA, HOLD_SEATS_LUA, RELEASE_SEATS_LUA } from './luaScripts.js';

export type HoldResult = { ok: true } | { ok: false; reason: 'SOLD' | 'HELD'; seatId: string };

export const holdKey = (st: string, seatId: string) => `hold:{${st}}:${seatId}`;
export const soldKey = (st: string) => `sold:{${st}}`;
export const holdIndexKey = (st: string) => `holdidx:{${st}}`;
export const versionKey = (st: string) => `ver:{${st}}`;

// ioredis registers each script once and calls it by its hash afterwards (EVALSHA).
export function registerScripts(redis: Redis) {
  redis.defineCommand('holdSeats', { lua: HOLD_SEATS_LUA });
  redis.defineCommand('releaseSeats', { lua: RELEASE_SEATS_LUA });
  redis.defineCommand('extendSeats', { lua: EXTEND_SEATS_LUA });
}

type Args = (string | number)[];
type WithScripts = Redis & {
  holdSeats(n: number, ...a: Args): Promise<[number, string?, string?]>;
  releaseSeats(n: number, ...a: Args): Promise<number>;
  extendSeats(n: number, ...a: Args): Promise<number>;
};

export async function holdSeats(
  redis: Redis,
  p: { showtimeId: string; seatIds: string[]; holdId: string; ttlMs: number; nowMs?: number },
): Promise<HoldResult> {
  const st = p.showtimeId;
  const keys = [soldKey(st), holdIndexKey(st), versionKey(st), ...p.seatIds.map((s) => holdKey(st, s))];
  const res = await (redis as WithScripts).holdSeats(keys.length, ...keys, p.holdId, p.ttlMs, p.nowMs ?? Date.now(), ...p.seatIds);
  if (res[0] === 1) return { ok: true };
  return { ok: false, reason: res[1] as 'SOLD' | 'HELD', seatId: String(res[2]) };
}

export async function releaseSeats(redis: Redis, p: { showtimeId: string; seatIds: string[]; holdId: string }) {
  const st = p.showtimeId;
  const keys = [holdIndexKey(st), versionKey(st), ...p.seatIds.map((s) => holdKey(st, s))];
  return (redis as WithScripts).releaseSeats(keys.length, ...keys, p.holdId, ...p.seatIds);
}

export async function extendSeats(redis: Redis, p: { showtimeId: string; seatIds: string[]; holdId: string; ttlMs: number; nowMs?: number }) {
  const st = p.showtimeId;
  const keys = [holdIndexKey(st), ...p.seatIds.map((s) => holdKey(st, s))];
  return (redis as WithScripts).extendSeats(keys.length, ...keys, p.holdId, p.ttlMs, p.nowMs ?? Date.now(), ...p.seatIds);
}

// Seats currently held by anyone (live holds only) and seats sold. Used to build the seat map availability.
export async function readAvailability(redis: Redis, st: string, nowMs = Date.now()) {
  const [held, sold, version] = await Promise.all([
    redis.zrangebyscore(holdIndexKey(st), nowMs, '+inf'),
    redis.smembers(soldKey(st)),
    redis.get(versionKey(st)),
  ]);
  return { held, sold, version: Number(version ?? 0) };
}
