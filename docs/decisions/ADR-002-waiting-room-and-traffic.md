# ADR-002: Waiting Room, Rate Limiting, and Surge Traffic Management

## Context
When blockbuster movie ticket booking opens (`booking_opens_at`), thousands of users converge on a single screening within seconds. Without traffic bounding, concurrent hold requests exhaust PostgreSQL connection pools, overwhelm Redis throughput, and lead to poor user experience.

## Decision
We implement a virtual waiting room and tiered rate limiting system:

1. **Dual Sorted-Set Redis Queue Architecture:**
   - `wr:queue:{showtimeId}`: Waiting queue sorted set with score = sequential integer counter (`INCR wr:seq:{showtimeId}`) guaranteeing strict FIFO fairness.
   - `wr:active:{showtimeId}`: Active admission sorted set where member = `userId` or `deviceId`, and score = expiration timestamp (Unix ms).
   - Under capacity (`active < 300` and queue empty), users bypass the queue and walk straight into seat selection.
   - During surges (`active >= 300`), incoming users are enqueued and receive their queue position and estimated wait time.

2. **Admission Rate & Heartbeat Lease:**
   - **Capacity:** Maximum 300 active users per showtime simultaneously browsing the seat map.
   - **Admission Rate:** Batch admission of up to 20 users per second executed via atomic `TICK_LUA` script.
   - **Lease Duration:** 120 seconds active admission window.
   - **Heartbeat:** Mobile client sends a lightweight heartbeat (`POST /v1/showtimes/:id/waiting-room/join`) every 30 seconds while the seat map is active, extending the lease until checkout or exit. Expired admissions are pruned atomically via `ZREMRANGEBYSCORE`.

3. **Multi-Tier Rate Limiting:**
   - In-memory sliding window rate limits via Redis:
     - Waiting Room Join: 10 req/min per user, 60 req/min per IP (`rl:wr`).
     - Seat Hold: 20 req/min per user, 120 req/min per IP (`rl:hold`).
     - Order Creation / Checkout: 5 req/min per user, 20 req/min per IP (`rl:order`).
     - Search / Public BFF: 30 req/min per IP (`rl:search`).
   - Rate limit headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`.

## Consequences
- Guaranteed database stability: Backend load is strictly capped at predictable concurrency thresholds.
- Fair customer experience: No user can skip the line or monopolize seat selection through automated scripts.
- Seamless transition: Mobile client transitions smoothly from queue countdown directly into the interactive seat map.
