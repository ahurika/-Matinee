---
name: seat-holds-and-booking-integrity
description: Use when building or changing seat holds, releasing seats, hold expiry, payment grace extension, the bookings unique constraint, the database fallback when Redis is down, or anything about never selling a seat twice in Matinee. Contains the tested Lua scripts and race tests in server/src/seats and server/test/seats.race.test.ts.
---

# Seat holds and booking integrity

## The problem in one picture

Two people tap seat F7 at the same millisecond. If the code does "is F7 free?" then "mark F7 held" as two steps, both can pass the first step. The fix is to make check-and-take **one atomic step**, so only one caller can win. Then add a second, independent guard in the database.

## Layer 1: Redis atomic hold

For one seat the command is `SET hold:{st}:F-7 <holdId> NX PX 600000`. `NX` means "only if it does not exist", so exactly one caller wins. Because a user usually wants several seats, we use a Lua script that does the same thing for many seats, **all or nothing**. Redis runs a script as one uninterruptible step.

Code: `server/src/seats/luaScripts.ts`, `redisHolds.ts` (tested). Keys per showtime share a hash tag, for example `hold:{showtime-1}:F-7`, so a script can touch them together (also on Redis Cluster).

| Script | Does |
|---|---|
| `HOLD_SEATS_LUA` | Checks every seat against the sold set and existing holds, then holds them all, or changes nothing. Adds seats to `holdidx:{st}` and bumps `ver:{st}`. Idempotent for the same holdId |
| `RELEASE_SEATS_LUA` | Deletes only seats whose value equals the caller's holdId (compare then delete) |
| `EXTEND_SEATS_LUA` | Payment grace: lengthens expiry for seats the caller still owns, never shortens |

## Layer 2: database safety net

```sql
ALTER TABLE bookings ADD CONSTRAINT bookings_showtime_seat_uniq UNIQUE (showtime_id, seat_id);
```

If any Redis bug, restart, or flush ever let two holds exist, the second `INSERT INTO bookings` fails with error `23505` and the payment job refunds it. Keep this constraint forever. Test T5 proves it: 500 concurrent inserts at 50 seats create exactly 50 rows.

## API behaviour

`PUT /showtimes/:id/hold { seatIds }` sets the user's whole selection:
1. Validate with Zod (1 to 8 unique seat ids), check the seats belong to this showtime's screen, showtime is open for booking, user is admitted (waiting room), rate limit passes.
2. Load the user's hold session `holdsession:{st}:{userId}` (holdId, expiresAt, seats). Create one if missing (`holdId = uuid`, `expiresAt = now + 10 min`).
3. Seats to add: run `holdSeats` with `ttlMs = expiresAt - now`. If it fails, return **409** with `{ code: 'SEAT_TAKEN', unavailableSeatIds }` and change nothing.
4. Seats to remove: run `releaseSeats`.
5. Save the session and return `{ holdId, expiresAt, serverNow, seatIds }`.

`DELETE /showtimes/:id/hold` releases everything the user holds.

One hold timer per user per showtime: the 10 minutes start at the first seat. Adding a seat later does not reset the timer.

## Expiry and cleanup

- Redis TTL releases seats by itself. Nothing needs to run for correctness.
- A repeatable `holds` job (every 30 seconds) marks `orders` that are `pending` past `hold_expires_at` as `expired`, deletes expired rows from `seat_holds` (fallback table), and trims old entries from `holdidx:{st}`.
- Failed payment or user cancel: release the seats right away (compare-and-delete) so others can take them.

## Payment grace

When the order is created, call `extendSeats` with `ttlMs` of at least 7 minutes. This stops a hold from expiring while the user is on the provider's payment page. It never revives seats already lost.

## When Redis is down (interview question 2)

Correctness does not depend on Redis, only speed does.
1. A circuit breaker marks Redis unhealthy after a few failures.
2. Holds use `holdSeatsInDb` (`server/src/seats/dbHolds.ts`): one transaction with a conditional upsert into `seat_holds` (a seat is taken only if no row exists, or the old row expired, or it is already yours) plus a check that the seat is not in `bookings`. All or nothing. Tested in T6.
3. A per-instance concurrency cap (about 20 hold transactions at once) protects Postgres. Extra requests get 503 with `Retry-After`.
4. Availability is read from the database and cached in memory for 2 seconds.
5. When Redis returns, rebuild `sold:{st}` from `bookings`, and let fallback holds expire.
6. Bookings stay correct because of the unique constraint. Throughput and latency suffer.

## Rebuilding Redis state

`sold:{st}` is a cache of the `bookings` table. On a cold or flushed showtime, load `SELECT seat_id FROM bookings WHERE showtime_id = $1 AND status = 'confirmed'` and `SADD`. The database wins any disagreement.

## Tests (T1 to T6 exist and pass)

T1 race (500 users, 50 seats, exactly 50 winners), T2 multi-seat all or nothing, T3 expiry, T4 release ownership, T5 database unique constraint, T6 database fallback. Add: T13 abandoned or failed payment releases seats, T16 Redis stopped and holds still work through the database. Run the whole file at least three times after any change.

Note from building the kit: an early version picked seats randomly and failed about one run in ten because some seats were never picked. Assign seats deterministically (`u % 50`).

## Explain-back questions for the human

1. Two users tap F7 in the same millisecond. Walk through exactly what happens, step by step.
2. Why keep the database unique constraint when Redis already prevents double holds?
3. Why does a Lua script make "hold 3 seats" safe when three separate `SET NX` calls would not be?
