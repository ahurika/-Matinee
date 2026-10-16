# AGENTS.md: server

Applies under `server/`. Root `AGENTS.md` and `PRD.md` still apply.

## Layout

```
server/
  src/
    app.ts, index.ts, worker.ts
    config/            env (Zod), pricing.ts (tested), traffic parameters
    routes/            movies, showtimes, holds, waitingRoom, orders, tickets, operator, webhooks, auth, health
    services/          booking, pricing use, refunds, tickets
    repositories/      all SQL
    seats/             luaScripts.ts, redisHolds.ts, dbHolds.ts   (tested reference, do not rewrite)
    traffic/           waitingRoom.ts, rateLimit.ts               (tested reference)
    integrations/
      tmdb/            tmdbClient.ts (the ONLY file that knows TMDB), cache.ts   (tested reference)
      paystack/        checkout and refund calls, signature verify
    jobs/              webhooks, holds sweeper, refunds, tmdb refresh
    middleware/        requestId, auth, rateLimit, idempotency, overload shedding
    lib/               logger, errors, redis, circuit breaker
  scripts/             seed.ts, loadtest-harness.ts
  test/                Vitest. seats.race, traffic, pricing, tmdb already exist
```

## Rules

1. Routes parse and respond. Services hold rules. Repositories hold SQL. Integrations hold third parties.
2. Services never read `process.env`. Use `config/`.
3. One error class with stable codes. Response shape `{ error: { code, message, requestId, fields? } }`. Add each code to `app/src/ui/errorMessages.ts`.
4. Never import a raw pg pool in a service. Use the repository layer.
5. Tests use real Postgres and Redis (docker compose). Each test file creates its own data.
6. Run `npm test` three times after touching `seats/`, `traffic/`, or `integrations/tmdb/`.
7. Migrations are new files, never edits. The `bookings` unique constraint and the ledger triggers are part of the first migrations.
