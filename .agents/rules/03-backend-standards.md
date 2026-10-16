---
trigger: glob
globs: `server/**`
---

# Rule 03: Backend system design standard

**Activation:** Glob `server/**`.

## Pipeline

Request id, structured log, Sentry, IP rate limit, auth, user rate limit, validation, handler. One error shape: `{ error: { code, message, requestId, fields? } }`.

## Layers

Routes parse and respond. Services hold business rules. Repositories hold all SQL. Integrations hold third-party code (`integrations/tmdb/tmdbClient.ts`, `integrations/paystack/`). Config in `config/`. Seat holds in `seats/`. Waiting room and rate limits in `traffic/`.

## Database

1. All SQL in repositories. Parameters only.
2. Use `timestamptz`. Use transactions for multi-step changes.
3. The `bookings` table has `UNIQUE (showtime_id, seat_id)`. Never remove it, never loosen it.
4. Connection pooling: pooled connection string, API pool max 10, worker pool max 5, 3 second connection timeout. Explain the numbers in an ADR (provider limit divided by processes plus headroom). A request that cannot get a connection fails fast with 503 and `Retry-After`.
5. Read routing: browse queries may use the read connection string. After a user writes, that user reads from the primary for 5 seconds (`recent_write:{userId}`). If Redis is down, read from the primary. Seat availability does not use Postgres at all.
6. Sharding is a documented plan only (`docs/SHARDING.md`). Do not build it.

## Caching

1. Cache-aside. Every key has a TTL. Invalidate explicitly. Use version numbers in keys instead of scanning.
2. TMDB TTLs: now playing 6 h, upcoming 12 h, detail 24 h, search 10 min, config and genres 24 h. Keep a stale copy for 7 days.
3. Seat layout cache 1 hour (immutable per screen). Availability comes from Redis state, not a cached DB query.
4. Never cache: payment status, order status during confirmation, ledger rows, webhook or idempotency records, user permissions.
5. Single flight: one refresh per cold key (Redis lock) to prevent stampedes.

## Rate limiting (Redis only)

Use `server/src/traffic/rateLimit.ts` (tested). Limits per user and per IP on hold, checkout, search, waiting room join, auth. Return 429 with `Retry-After`. See `PRD.md` Appendix B.

## Background jobs (BullMQ)

Queues: `webhooks`, `holds`, `refunds`, `tmdb`. Defaults: 5 attempts, exponential backoff starting at 2 seconds, keep failed jobs. Jobs are idempotent. Workers run in a separate process. Log every attempt with job id, attempt, request id, and outcome.

## Resilience

1. Circuit breaker around TMDB (5 failures opens it for 30 seconds) and around Redis for seat holds.
2. When Redis is down, holds use the database fallback (`seats/dbHolds.ts`), limited by a per-instance concurrency cap. Overflow gets 503 with `Retry-After`.
3. Overload shedding: if the event loop lag or pool wait is high, reject new hold and waiting room requests with 503 before the server falls over.
4. Graceful shutdown closes the HTTP server, queues, pools, and Redis.

## Observability

Pino JSON logs with `requestId`, `userId`, `route`, `status`, `durationMs`. Seat holds log `showtimeId`, seat count, outcome (`hold_ok`, `hold_conflict`, `hold_sold`, `hold_rate_limited`, `hold_degraded`). Pass the request id into jobs. Sentry on server and worker.

## Evidence

When you add an index, cache, or limit, save before and after numbers in `docs/performance/`. Never claim a result you did not measure.
