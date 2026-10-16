---
name: sharding-pooling-replication-plan
description: Use when setting up Matinee database connections (pool sizes and reasons), read and write routing with read-your-own-writes, and when writing docs/SHARDING.md (a plan only, no simulation): which tables to shard, the shard key, the hot blockbuster showtime risk, and the mitigation.
---

# Pooling, read routing, and the sharding plan

## Pooling

A pool is a fixed set of database connections shared by all requests, like a few taxis serving everyone instead of a new car per passenger. Postgres has a connection limit (default 100). Opening a connection is slow.

- Use the provider's pooled connection string (PgBouncer style) for the API.
- API process `max: 10`, worker process `max: 5`, `connectionTimeoutMillis: 3000`, `idleTimeoutMillis: 30000`.
- Write the reasoning in `ADR-007`: provider connection limit divided by (API instances x 10 + workers x 5), keep headroom for migrations and admin tools. Example with two API instances and one worker: 25 connections of a 100 limit.
- If you use PgBouncer in transaction mode, prepared statements and `SET` need care. Check your ORM's docs for the current setting for pooled connections.
- A request that cannot get a connection within 3 seconds returns 503 with `Retry-After`. It never hangs.
- Seat holds and availability do not use Postgres on the normal path, which is why the pool survives a surge.

## Read and write routing (read-your-own-writes)

Writes go to the primary. Browse reads (movies snapshots, cinemas, showtimes lists) may use a read connection string or replica. Replicas lag, so after a user writes they must not read a stale copy.

```ts
export async function dbForRead(userId: string) {
  try { if (await redis.exists(`recent_write:${userId}`)) return primary; } catch { return primary; } // Redis down: primary
  return replica;
}
// after any successful write by a user: SET recent_write:{userId} 1 EX 5
```

Money, orders, tickets, and webhook state always read from the primary. In development the read string can point at the same database. In `ARCHITECTURE.md` say what changes in production: a real replica, lag monitoring, failover.

## docs/SHARDING.md (write in your own words)

### 1. What would be sharded

| Sharded (transactional, grows with traffic) | Not sharded (small, read-mostly reference data) |
|---|---|
| bookings, orders, order_seats, payment_attempts, webhook_events, ledger_entries, seat_holds | cinemas, screens, seats, showtimes, movie_snapshots, users, refresh_tokens |

Reference tables are small and could be copied to every shard or kept in a global database.

### 2. Shard key: `showtime_id`

Why: everything about one showtime's sales lives together. The rule that matters most, `UNIQUE (showtime_id, seat_id)`, can only be enforced inside one database. With `showtime_id` as the key, that constraint stays local and strong. Alternatives and why not: `cinema_id` (a busy cinema becomes a hot shard and showtimes of one hall would still contend), `user_id` (spreads load, but the seat uniqueness would span shards and need distributed locks).

Use a stable hash with virtual shards: `virtualShard = hash(showtime_id) % 64`, and a small mapping table `virtual_shard -> physical database`. Moving load later means changing the map and copying data, not rehashing everything.

### 3. Hot shard risk: one blockbuster showtime

All traffic for a premiere hits one key range. Mitigations, in order:
1. **Redis absorbs the storm.** Holds, the waiting room, and availability never touch the database. Postgres only sees confirmed bookings, at most one per seat (a few hundred writes for a 320 seat hall, not millions of attempts).
2. **Waiting room and rate limits** cap the pressure.
3. **Pre-provision** a dedicated physical shard for known release days and map that showtime's virtual shard to it before booking opens.
4. **Split by screen** if one release has many screens: they are separate showtimes with separate keys, so they spread naturally.
5. **Read scaling:** seat map layout and TMDB data come from cache.

### 4. Queries that become harder

- "My tickets" across showtimes: needs a global index table `user_tickets(user_id, showtime_id, booking_id)` or a scatter-gather across shards.
- Reports across all showtimes (revenue per day): scatter-gather and merge, or a nightly warehouse copy.
- Foreign keys from orders to users and showtimes cannot be enforced across databases. Enforce in code and with reconciliation jobs.
- Refunds for a cancelled showtime run on one shard (good). Refund totals across all showtimes need a merge.

### 5. Other trade-offs to state

No cross-shard transactions (use the outbox pattern for events). Changing the shard count later needs data movement (virtual shards reduce this). More operational work (backups, migrations per shard).

## Tests and evidence

A small unit test for the hash (stable, evenly spread) is nice to have. The graded item is the written plan.

## Explain-back questions for the human

1. Why `showtime_id` as the shard key? When does it fail?
2. Why does Redis make the hot shard problem much smaller?
3. Which user-facing query becomes harder, and how do you fix it?
