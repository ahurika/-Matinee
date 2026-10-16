# Matinee Database Sharding & Partitioning Plan

## 1. Overview & Objective

This document outlines the horizontal sharding, connection pooling, and read-replica routing plan for Matinee. While the present system operates reliably on a single managed PostgreSQL primary with PgBouncer connection pooling and Redis in-memory acceleration, this design details how the storage architecture scales horizontally when nationwide ticket volumes exceed the throughput limits of a single write node.

---

## 2. Table Classification: Sharded vs. Global Reference Data

| Category | Tables | Justification & Scale Profile |
|---|---|---|
| **Sharded (Transactional)** | `bookings`, `orders`, `order_seats`, `webhook_events`, `ledger_entries`, `seat_holds` | Rapid write growth, strict append-heavy workloads, contention localized around specific showtimes. |
| **Global / Reference Data** | `cinemas`, `screens`, `seats`, `showtimes`, `movie_snapshots`, `users`, `refresh_tokens` | Read-dominated, low update volume. Readily cached in Redis and replicated across all regional read replicas. |

---

## 3. Shard Key Selection: `showtime_id`

The chosen shard key for all transactional data is **`showtime_id`**.

### Why `showtime_id`?
1. **Local Constraint Enforcement:** Matinee's ultimate safety invariant is the PostgreSQL unique constraint:
   ```sql
   CONSTRAINT bookings_showtime_seat_uniq UNIQUE (showtime_id, seat_id)
   ```
   In a horizontally sharded database, unique constraints spanning multiple physical nodes require expensive, high-latency two-phase distributed transactions (2PC). By partitioning strictly on `showtime_id`, **every seat booking and hold for a given screening is guaranteed to reside on the same physical shard**, allowing PostgreSQL to enforce the unique constraint locally with zero distributed locking overhead.
2. **Transaction Isolation:** Order creation, ledger entries, and ticket issuance for a given showtime occur within a single database transaction on a single shard.

### Rejected Alternatives
- **`user_id`:** While `user_id` distributes buyer activity evenly, it scatters seat bookings for the same movie across different shards. Two users attempting to book seat `A12` would hit different databases, rendering PostgreSQL's local unique constraint useless and necessitating distributed locks across shards.
- **`cinema_id`:** A large multi-plex cinema (e.g. 15 screens in Lagos) would create a disproportionately massive hot shard, while smaller cinemas would underutilize storage.

---

## 4. Virtual Sharding & Hash Topology

To prevent costly resharding when expanding physical clusters:
- The system employs **64 virtual shards**:
  $$\text{virtual\_shard\_id} = \text{CRC32}(\text{showtime\_id}) \pmod{64}$$
- A lightweight routing directory maps each `virtual_shard_id` to a physical PostgreSQL cluster instance.
- Migrating data as capacity grows involves migrating individual virtual shards to newly provisioned physical nodes without modifying application hashing algorithms.

---

## 5. Mitigating the Hot Blockbuster Risk

A major concern with showtime-based sharding is the "Blockbuster Opening" scenario: when a global blockbuster premiere (e.g. *Dune: Part Two* or *Avengers*) goes on sale, millions of requests surge toward a single showtime, concentrating traffic onto one shard.

Matinee neutralizes this risk through layered defensive tiers:
1. **In-Memory Buffering (Redis Absorbs the Storm):**
   - Seat selection and atomic holds never touch PostgreSQL during the rush. The Redis Lua script handles up to thousands of requests per second in-memory.
   - For a 320-seat hall, PostgreSQL only receives at most 320 confirmed booking writes once payment succeeds, completely shielding the database from the 100,000+ failed hold attempts.
2. **Waiting Room Gatekeeper:** The admission rate limiter caps the number of users concurrently browsing and holding seats at 20 users per second, eliminating sudden load spikes.
3. **Pre-Allocation for Major Releases:** For anticipated blockbusters, the routing table can map that specific showtime's virtual shard to a dedicated high-spec physical database node ahead of opening time.
4. **Natural Screen Partitioning:** Popular releases are split across multiple screens and time slots; because each screen is an independent showtime with a distinct `showtime_id`, load distributes naturally across the virtual shard ring.

---

## 6. Complex Cross-Shard Queries & Mitigations

Partitioning by `showtime_id` introduces complexity for queries spanning multiple showtimes:
- **"My Tickets" Screen (`GET /v1/tickets`):**
  - *Challenge:* A user's bookings may reside across multiple different showtime shards.
  - *Mitigation:* A lightweight global index table `user_bookings(user_id, showtime_id, booking_id, created_at)` is maintained on the user's primary shard, allowing instantaneous lookup of target showtime shards without scatter-gather queries.
- **Reporting & Accounting Audits:** Read-only replica ETL pipelines replicate all shard transaction logs into a central ClickHouse/Snowflake data warehouse for cross-cinema revenue reporting.

---

## 7. Connection Pooling Topology

PostgreSQL connections are resource-intensive (operating system process fork per connection). Matinee uses PgBouncer in transaction pooling mode:
- **API Server Instance:** Connection pool capped at 10 (`max: 10`).
- **Background Worker:** Connection pool capped at 5 (`max: 5`).
- **Connection Timeout:** Strict 3,000 ms ceiling (`connectionTimeoutMillis: 3000`). Requests that cannot acquire a pool connection fail fast with HTTP 503 and `Retry-After: 3`, preventing server thread starvation.
- **Headroom Formula:** Total physical DB connections $= \text{Instances} \times 10 + \text{Workers} \times 5 + 20 \text{ (Admin/Migration reserve)}$, maintaining safe margin below the 100-connection limit.
