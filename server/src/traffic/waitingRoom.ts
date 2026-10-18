import { Redis } from 'ioredis';

// Waiting room for one showtime. Two sorted sets:
//   wr:queue:{st}   members = userId, score = join order (a counter, so order is exact and fair)
//   wr:active:{st}  members = userId, score = the time their admission expires (ms)
// A tick runs about once per second. It admits at most `rate` people and never lets active exceed `capacity`.

const JOIN_LUA = `
-- KEYS[1]=queue KEYS[2]=active KEYS[3]=seq counter
-- ARGV[1]=userId ARGV[2]=now ARGV[3]=activeTtlMs ARGV[4]=capacity
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', ARGV[2])            -- drop expired admissions first
if redis.call('ZSCORE', KEYS[2], ARGV[1]) then
  redis.call('ZADD', KEYS[2], tonumber(ARGV[2]) + tonumber(ARGV[3]), ARGV[1])   -- heartbeat: extend admission
  return { 'ACTIVE', 0 }
end
local s = redis.call('ZSCORE', KEYS[1], ARGV[1])
if not s then
  -- No line and room to spare: walk straight in. The waiting room only appears when demand exceeds capacity.
  if redis.call('ZCARD', KEYS[1]) == 0 and redis.call('ZCARD', KEYS[2]) < tonumber(ARGV[4]) then
    redis.call('ZADD', KEYS[2], tonumber(ARGV[2]) + tonumber(ARGV[3]), ARGV[1])
    return { 'ACTIVE', 0 }
  end
  s = redis.call('INCR', KEYS[3])
  redis.call('ZADD', KEYS[1], s, ARGV[1])
end
return { 'QUEUED', redis.call('ZRANK', KEYS[1], ARGV[1]) + 1 }
`;

const TICK_LUA = `
-- KEYS[1]=queue KEYS[2]=active  ARGV[1]=now ARGV[2]=capacity ARGV[3]=ratePerTick ARGV[4]=activeTtlMs
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', ARGV[1])
local free = tonumber(ARGV[2]) - redis.call('ZCARD', KEYS[2])
local n = math.min(tonumber(ARGV[3]), free)
local admitted = {}
if n <= 0 then return admitted end
local popped
local ok, res = pcall(redis.call, 'ZPOPMIN', KEYS[1], n)
if ok then
  popped = res
else
  popped = redis.call('ZRANGE', KEYS[1], 0, n - 1, 'WITHSCORES')
  for i = 1, #popped, 2 do
    redis.call('ZREM', KEYS[1], popped[i])
  end
end
for i = 1, #popped, 2 do
  redis.call('ZADD', KEYS[2], tonumber(ARGV[1]) + tonumber(ARGV[4]), popped[i])
  admitted[#admitted + 1] = popped[i]
end
return admitted
`;

type WR = Redis & {
  wrJoin(n: number, ...a: (string | number)[]): Promise<[string, number]>;
  wrTick(n: number, ...a: (string | number)[]): Promise<string[]>;
};

export const wrKeys = (st: string) => ({
  queue: `wr:queue:{${st}}`,
  active: `wr:active:{${st}}`,
  seq: `wr:seq:{${st}}`,
});

export function registerWaitingRoom(redis: Redis) {
  redis.defineCommand('wrJoin', { lua: JOIN_LUA });
  redis.defineCommand('wrTick', { lua: TICK_LUA });
}

export async function join(redis: Redis, st: string, userId: string, now: number, activeTtlMs: number, capacity: number) {
  const k = wrKeys(st);
  const [state, position] = await (redis as WR).wrJoin(3, k.queue, k.active, k.seq, userId, now, activeTtlMs, capacity);
  return { state: state as 'ACTIVE' | 'QUEUED', position };
}

export async function tick(
  redis: Redis,
  st: string,
  o: { now: number; capacity: number; ratePerTick: number; activeTtlMs: number },
) {
  const k = wrKeys(st);
  return (redis as WR).wrTick(2, k.queue, k.active, o.now, o.capacity, o.ratePerTick, o.activeTtlMs);
}

export async function isActive(redis: Redis, st: string, userId: string, now: number) {
  const score = await redis.zscore(wrKeys(st).active, userId);
  return score !== null && Number(score) > now;
}
