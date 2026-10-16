# ADR-001: Atomic Seat Reservation via Redis Lua Scripts

## Context
During ticket drops for blockbuster screenings, thousands of concurrent users attempt to select and reserve the exact same seats within fractions of a second. A naive approach using relational database transactions (`SELECT FOR UPDATE` or "check then set") creates severe database row lock contention, thread starvation, connection pool exhaustion, and risks double bookings under high concurrency.

## Decision
We implement a two-tier seat hold and booking integrity architecture:
1. **Tier 1 (Redis Lua Atomic Script):**
   - All seat hold operations execute as an atomic Lua script (`HOLD_SEATS_LUA`) directly on the single-threaded Redis engine.
   - The script verifies that all requested seats are unheld. If all are free, it sets hold keys with 10-minute TTL and increments the showtime version counter in a single atomic step.
   - If any seat is already occupied, the script aborts immediately with zero partial state changes and returns the conflicting seat ID.
2. **Tier 2 (PostgreSQL Relational Safety Net):**
   - The `bookings` table enforces `UNIQUE (showtime_id, seat_id)`.
   - If Redis is unavailable, the system degrades to database-backed row reservation with optimistic locking (`dbHolds.ts`), guaranteeing that duplicate bookings can never be physically written to persistent storage.

## Consequences
- Redis handles thousands of concurrent hold attempts per second with sub-2ms response times.
- Database connection pools remain available exclusively for order creation and webhook processing.
- Multi-seat holds are strictly all-or-nothing; partial reservations are impossible.
