---
name: observability-and-resilience
description: Use when adding Matinee request ids and structured logs, job attempt logs, hold outcome logging, Sentry on app and server, circuit breakers, overload shedding, graceful shutdown, and the app side of graceful failure (retry messages instead of crashes). Needed for the load test log write-up.
---

# Observability and resilience

## What you must be able to answer from logs

"What happened to this user's seat hold at 10:00:03?" and "What did the server do during the load test?" You answer by searching one request id across the request, the hold attempt, the queued job, the webhook, and the ledger write.

## Logging (pino, JSON)

One line per request when it finishes:

```json
{"level":"info","msg":"request","requestId":"7f1c...","userId":"u-42","route":"/v1/showtimes/:id/hold","status":409,"durationMs":14}
```

Add domain lines:

| Event | Fields |
|---|---|
| `hold_ok`, `hold_conflict`, `hold_sold`, `hold_rate_limited`, `hold_degraded` | requestId, userId, showtimeId, seatCount, durationMs |
| `waiting_room_join` | state, position, queueLength, activeCount |
| `order_created` | orderId, totalKobo |
| `webhook_received`, `webhook_rejected_signature`, `webhook_duplicate`, `webhook_processed` | eventId, orderId, outcome |
| `ledger_written` | orderId, type, amountKobo |
| `refund_requested`, `refund_done` | orderId |
| `tmdb_cache_hit`, `tmdb_cache_miss`, `tmdb_stale_served`, `tmdb_circuit_open` | key |
| `redis_circuit_open`, `redis_circuit_closed` | |
| `job_attempt` | queue, jobId, attempt, outcome, requestId |

Rules: use the route pattern, not the raw URL. Pass `requestId` into job data. Never log tokens, passwords, signatures, payment payloads, or full TMDB bodies. Send `x-request-id` back in the response and include it in every error body.

## Sentry

Server and worker: `@sentry/node`, init first, capture errors in the error handler and in failed jobs, scrub request bodies on auth and payment routes. App: `@sentry/react-native` with the current Expo setup from Sentry's docs. The DSN goes in `EXPO_PUBLIC_SENTRY_DSN_APP`. The auth token for source maps is an EAS secret. Cause one deliberate error on each side and screenshot the Sentry issue for the README.

## Circuit breakers

- **TMDB:** already in `tmdbClient.ts` (5 failures opens it for 30 s, stale served).
- **Redis for holds:** wrap Redis calls in the seat service. After 3 consecutive errors, open for 15 seconds and use `holdSeatsInDb`. Log `redis_circuit_open`. Close it after a successful health ping.
- **Payment provider:** order creation fails fast with `SERVICE_UNAVAILABLE` if the provider is down. Seats stay held.

## Overload shedding

Measure event loop lag (for example with `perf_hooks.monitorEventLoopDelay`) and pool wait time. When either is high, hold and join requests return 503 with `Retry-After` and code `SERVICE_UNAVAILABLE`. Webhooks, order status, and tickets are never shed.

## Graceful shutdown

On SIGTERM: stop accepting requests, finish in-flight ones, close queues and workers, end pools, quit Redis. A deploy must not drop a webhook halfway.

## App side: failure that does not crash

1. A global error boundary around the app shows a recovery screen with "Try again".
2. Every request error maps through `toUxMessage`. Show the message and a Retry button. Keep the user's seats and inputs.
3. On 429 or 503 during seat selection: keep the last known map, show a banner, back off polling (3 s, 6 s, 12 s, max 15 s).
4. Offline: show cached tickets, disable actions that need the network, say why.
5. Test by turning the server off, returning 503s, and throttling the network on a real phone. Record this for the demo.

## Load test log write-up (deliverable)

After the k6 run, search the server logs for the run window and write a short section in `load-tests/REPORT.md`: counts of each hold outcome, how many requests were shed, slowest requests and why (pool wait? Redis latency?), any Redis or TMDB circuit events, any errors in Sentry. Use real numbers only.

## Tests

- Request id appears in the response header, the log line, and the job log for one flow.
- Redis stopped: the hold still succeeds through the database path and logs `hold_degraded` (T16).
- 503 body has the standard shape and `Retry-After`.
- App: error boundary renders on a thrown render error.

## Explain-back questions for the human

1. How would you find one user's failed hold from the logs?
2. What happens to bookings if Redis dies during a surge?
3. Why are webhooks never shed under overload?
