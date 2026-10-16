---
trigger: glob
globs: `server/src/seats/**`, `server/src/traffic/**`, `server/src/routes/holds*`, `server/src/routes/waiting*`. Also Model Decision.
---

# Rule 08: Traffic and concurrency

**Activation:** Glob `server/src/seats/**`, `server/src/traffic/**`, `server/src/routes/holds*`, `server/src/routes/waiting*`. Also Model Decision.

The tested reference code is in `server/src/seats/` and `server/src/traffic/`. Copy and adapt it. Do not rewrite the Lua from memory.

## Correctness comes first

1. Seat holds are one atomic Redis Lua step. Never check "is it free" and then "mark it held" as two commands.
2. A hold request is all or nothing for its seats.
3. The database is the final authority: `bookings UNIQUE (showtime_id, seat_id)`. Even if Redis fails or has a bug, Postgres refuses a second booking.
4. Redis key names use a hash tag per showtime (`hold:{<showtimeId>}:<seatId>`) so one script can touch all of a showtime's keys, also on Redis Cluster.
5. Release and extend are compare-and-act on the holder id. Never delete or extend a key you do not own.
6. The sold set in Redis is a cache of the bookings table. It can be rebuilt from the database. The database wins any disagreement.

## Load control

1. Waiting room per showtime (`traffic/waitingRoom.ts`): users walk in while there is room and no line. Otherwise they queue and are admitted at a fixed rate. Capacity and rate come from `PRD.md` Appendix B and are justified in `docs/TRAFFIC.md`.
2. Seat endpoints require an active admission once a waiting room exists for that showtime.
3. Rate limit hold, checkout, search, and waiting room join per user and per IP (`traffic/rateLimit.ts`).
4. Availability is a cheap read: one version number, an ETag, and 304 when unchanged.
5. TMDB and seat layouts are served from cache. Only the hold path touches Redis state per request.

## Failure behavior

1. Redis down: circuit breaker opens, holds use the database fallback with a concurrency cap, overflow gets 503 with `Retry-After`. Bookings stay correct.
2. Overload: shed load early with 503 and a clear error code (`SERVICE_UNAVAILABLE`, `ROOM_FULL`). The app shows a friendly message and Retry.
3. Late payment: never depend on the hold at webhook time. The unique constraint decides.
4. Expiry: Redis TTL releases seats. A sweeper job marks pending orders as expired and cleans the fallback table.

## Race test discipline

Race tests assign seats deterministically (`u % 50`). After any change to the Lua scripts, waiting room, or rate limiter, run `npm test` at least three times. A passing test once is not proof.

## Never

- Never use `GET` then `SET` for locks.
- Never use `KEYS` or `SCAN` in a request path.
- Never hold a database transaction open while waiting for Redis or a third party.
- Never trust the client to say a seat is free.
