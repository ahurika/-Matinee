// Lua runs inside Redis as ONE atomic step. No other command can run in the middle of a script.
// All keys for one showtime share a hash tag, for example hold:{<showtimeId>}:<seatId>. In Redis Cluster that
// puts them in the same slot, which is required for a script to touch several keys at once.

// HOLD (all or nothing)
// KEYS[1] = sold set       sold:{st}
// KEYS[2] = hold index     holdidx:{st}   sorted set: member = seatId, score = hold expiry in ms
// KEYS[3] = version        ver:{st}       integer, bumped on every change (used for ETag and cache keys)
// KEYS[4..n] = seat keys   hold:{st}:<seatId>
// ARGV[1] = holdId, ARGV[2] = ttl in ms, ARGV[3] = now in ms, ARGV[4..n] = seat ids (same order as KEYS[4..n])
// Returns { 1 } on success, or { 0, 'SOLD' | 'HELD', seatId } if any seat is unavailable. Nothing is changed on failure.
export const HOLD_SEATS_LUA = `
local holdId = ARGV[1]
local ttl = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
for i = 4, #KEYS do
  local seatId = ARGV[i]
  if redis.call('SISMEMBER', KEYS[1], seatId) == 1 then return { 0, 'SOLD', seatId } end
  local owner = redis.call('GET', KEYS[i])
  if owner and owner ~= holdId then return { 0, 'HELD', seatId } end
end
for i = 4, #KEYS do
  if not redis.call('GET', KEYS[i]) then
    redis.call('SET', KEYS[i], holdId, 'PX', ttl)
    redis.call('ZADD', KEYS[2], now + ttl, ARGV[i])
  end
end
redis.call('INCR', KEYS[3])
return { 1 }
`;

// RELEASE (only seats that still belong to this holdId)
// KEYS[1] = hold index, KEYS[2] = version, KEYS[3..n] = seat keys. ARGV[1] = holdId, ARGV[2..n] = seat ids.
// Returns how many seats were released.
export const RELEASE_SEATS_LUA = `
local released = 0
for i = 3, #KEYS do
  if redis.call('GET', KEYS[i]) == ARGV[1] then
    redis.call('DEL', KEYS[i])
    redis.call('ZREM', KEYS[1], ARGV[i - 1])
    released = released + 1
  end
end
if released > 0 then redis.call('INCR', KEYS[2]) end
return released
`;

// EXTEND (payment grace): push the expiry of seats this holdId still owns out to now + ttl, never shorten it.
// KEYS[1] = hold index, KEYS[2..n] = seat keys. ARGV[1] = holdId, ARGV[2] = ttl ms, ARGV[3] = now ms, ARGV[4..n] = seat ids.
// Returns how many seats were extended. Seats already lost are not revived.
export const EXTEND_SEATS_LUA = `
local extended = 0
local ttl = tonumber(ARGV[2])
for i = 2, #KEYS do
  if redis.call('GET', KEYS[i]) == ARGV[1] then
    if redis.call('PTTL', KEYS[i]) < ttl then
      redis.call('PEXPIRE', KEYS[i], ttl)
      redis.call('ZADD', KEYS[1], tonumber(ARGV[3]) + ttl, ARGV[i + 2])
    end
    extended = extended + 1
  end
end
return extended
`;
