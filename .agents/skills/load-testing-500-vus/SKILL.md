---
name: load-testing-500-vus
description: Use when running and reporting the Matinee load test: 500 virtual users trying to hold the same 50 seats at once with k6, proving zero double bookings with a SQL query, response times and error rates, and writing load-tests/REPORT.md. A tested k6 script and a stand-in harness are included.
---

# Load test: 500 users, 50 seats

## Goal

Prove two things with evidence: **no seat is sold twice** and **the system stays up and answers fast**. The report must contain real numbers from a real run. Never invent them.

## Files

| File | Purpose |
|---|---|
| `load-tests/hold-race.js` | k6 script. 500 virtual users, one iteration each. User N tries seat `S-((N-1) % 50 + 1)`, so each of the 50 seats gets exactly 10 competitors. Winners then "pay" by creating a booking |
| `server/scripts/loadtest-harness.ts` | Stand-in server that uses the real tested hold code and the real `bookings` table. Use it to rehearse the script before your real endpoints exist. Replace the URLs in the script with the real hold and order flow when ready |

The script was validated in the kit's sandbox: 500 users, 50 holds won, 450 lost, 50 bookings, 0 duplicate seats, 0 percent failed requests (409 is an expected answer, so the script marks 200 and 409 as expected). Your numbers will differ with your hardware. Do not copy the sandbox numbers.

## Install k6

k6 is a separate tool, not an npm package. Install it from the official k6 docs for your OS and check `k6 version`.

## Prepare

1. Seed a showtime with 320 seats (the seed script prints the showtime id).
2. Run against a staging or local server, not the free-tier instance you use for the demo. Write down where it ran.
3. Real flow needs 500 logged-in users. Create them in a setup script and write their tokens to a JSON file, or log in inside `setup()` slowly enough to avoid the login rate limit. Access tokens last 15 minutes, so keep the run short.
4. Rate limits: do not weaken them in production. Support `LOADTEST_MODE=true`, honored only when `NODE_ENV !== 'production'`, that raises the hold limit so the test measures concurrency, not the limiter. (Run a second smaller test with limits on, to show the limiter works: expect 429s with `Retry-After`.)
5. Waiting room: run once with the waiting room capacity above 500 (to test pure hold contention) and once at capacity 300 (to show admission and queueing). Say which in the report.

## Run

```
k6 run --summary-export=docs/performance/k6-hold-race.json \
  -e BASE_URL=https://your-staging-url -e SHOWTIME_ID=<id> load-tests/hold-race.js
```

Run it at least twice (fresh data each time: truncate `bookings`, flush the showtime's Redis keys, or use a new showtime) and report both.

## Prove zero double bookings

```sql
-- must return 0
SELECT count(*) FROM (
  SELECT showtime_id, seat_id FROM bookings GROUP BY 1, 2 HAVING count(*) > 1
) x;

-- must be 50 or fewer, and equal to the number of distinct seats
SELECT count(*) AS bookings, count(DISTINCT seat_id) AS distinct_seats
FROM bookings WHERE showtime_id = '<id>';
```

Also check the k6 counters: `holds_won` must be 50 or fewer, `holds_won + holds_lost` must equal 500. Save the query output in `docs/test-results/load-proof.txt`.

## Extra scenarios (pick two if time allows)

1. **Redis down:** stop Redis in the middle of the run and show holds continue through the database fallback with higher latency and no double booking (T16).
2. **Webhook storm:** send every payment event three times and show one booking per seat.
3. **Browse surge:** 500 users on `GET /movies/now-playing` and showtimes, showing cache hit rates and TMDB call count (should be near zero).
4. **Polling load:** 300 users polling availability every 3 seconds, showing 304 share and p95.

## Report (`load-tests/REPORT.md`, all numbers from real output)

1. **Environment:** machine or host, region, Node version, Postgres and Redis location, pool sizes, number of server instances.
2. **Test design:** virtual users, seats, scenario, waiting room setting, data size.
3. **Results table:** requests, holds won and lost, bookings created, error rate (real failures), p50, p95, p99 of hold duration, throughput.
4. **Proof:** the two SQL results, copied from your terminal.
5. **What the logs show** (see `observability-and-resilience`): outcomes counted per type, shed requests, slowest requests and why.
6. **What surprised you** (interview question 8). Write what you really saw, for example pool waits, a slow first request, Redis latency, or limiter behavior.
7. **Limits of the test:** one machine generating load, network distance, free tiers.
8. **Next steps.**

## Explain-back questions for the human

1. Why does a 409 count as a success in this test?
2. What exactly proves no seat was sold twice?
3. What did the test reveal that you did not expect, and what did you change?
