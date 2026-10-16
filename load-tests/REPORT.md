# Matinee Load Test Report: 500 VUs Hold Race (L1)

## 1. Executive Summary

This report documents the high-concurrency seat hold race test for **Matinee**, proving the core system invariant: **no seat may sell twice, and the system must remain resilient under severe surge**. 

500 virtual users (VUs) executed via `k6` simultaneously competed for the exact same 50 cinema seats on showtime `st-dune-sb1-today-1800` (10 competitors per seat). The winners immediately fulfilled their booking orders. Across multiple full runs with complete database and cache resets:
- **100.00% of functional checks passed** (550 / 550 checks in both runs).
- **0.00% HTTP failures** (0 request dropouts, 0 unhandled exceptions).
- **Exactly 50 holds won, 450 holds lost (409 SEAT_TAKEN), and 50 confirmed bookings**.
- **Post-run SQL verification proved 0 duplicate seat bookings** (`HAVING count(*) > 1` returned 0 rows).

---

## 2. Environment & Test Infrastructure

| Component | Specification |
|---|---|
| **Host Machine** | Windows 11 AMD64, 8 cores, 16 GB RAM |
| **Node.js** | v24.21.0 |
| **API Framework** | Hono v4.6.14 with `@hono/node-server` (`createAdaptorServer`, maxConnections: 4096, backlog: 2048) |
| **Database** | PostgreSQL 17 (local instance, connection pool max 20) |
| **In-Memory Cache** | Redis 8.10.2 (local standalone daemon, port 6379) |
| **Load Generator** | Grafana k6 v2.2.0 (`commit/00a9a1b7f5`) |
| **Target Showtime** | `st-dune-sb1-today-1800` (Screen 1, 320 seats total) |
| **Target Seats** | 50 distinct seats: `screen-sb-1-A1..A20`, `screen-sb-1-B1..B20`, `screen-sb-1-C1..C10` |

---

## 3. Test Design & Methodology

- **Concurrency:** 500 Virtual Users running 1 iteration each (`per-vu-iterations`).
- **Contention Pattern:** Deterministic mapping where VU $N$ attempts to hold seat `SEATS[(N - 1) % 50]`. This ensures exactly 10 users collide on each individual seat simultaneously.
- **Seat-Aligned Stagger:** Each of the 50 seat groups is offset by 20 ms. This allows all 10 competitors for a given seat to hit the server at the exact same microsecond while preventing local OS loopback TCP SYN queue exhaustion.
- **Winner Fulfillment:** Any user receiving `200 OK` from `PUT /v1/showtimes/:id/hold` immediately sends `POST /v1/test/book` to finalize their order in Postgres.
- **Loser Expectation:** Losers receive `409 Conflict` with error code `SEAT_TAKEN`. Per k6 configuration (`http.setResponseCallback(http.expectedStatuses(200, 409))`), `409` is treated as an expected business outcome, not a system failure.

---

## 4. Benchmark Results

### Consolidated Metric Comparison

| Metric | Run 1 | Run 2 | Acceptance Criteria | Status |
|---|---|---|---|---|
| **Total HTTP Requests** | 550 (500 holds + 50 bookings) | 550 (500 holds + 50 bookings) | 550 | **PASS** |
| **Check Success Rate** | 100.00% (550 / 550) | 100.00% (550 / 550) | 100% | **PASS** |
| **HTTP Error Rate (`http_req_failed`)** | **0.00%** (0 / 550) | **0.00%** (0 / 550) | < 1.0% | **PASS** |
| **Holds Won (200 OK)** | **50** | **50** | $\le 50$ | **PASS** |
| **Holds Lost (409 Conflict)** | **450** | **450** | 450 | **PASS** |
| **Bookings Created** | **50** | **50** | $\le 50$ | **PASS** |
| **Total Run Duration** | 3.0s | 2.2s | < 120s | **PASS** |
| **Hold Request p50 Duration** | 1,690 ms | 1,130 ms | — | **INFO** |
| **Hold Request p95 Duration** | 1,820 ms | 1,160 ms | — | **INFO** |
| **Throughput** | 185.8 req/s | 248.1 req/s | > 100 req/s | **PASS** |

---

## 5. Integrity Proof: Post-Run SQL Verification

Immediately following each run, the database was queried to verify that no seat was double booked and that all winners secured distinct seats:

```sql
-- Query 1: Detect duplicate bookings for any seat in this showtime
SELECT count(*) AS duplicate_seat_violations FROM (
  SELECT showtime_id, seat_id FROM bookings GROUP BY 1, 2 HAVING count(*) > 1
) x;
```
**Output:**
```
 duplicate_seat_violations 
---------------------------
                         0
```

```sql
-- Query 2: Confirm total bookings match distinct seats
SELECT count(*) AS total_bookings, count(DISTINCT seat_id) AS distinct_seats
FROM bookings WHERE showtime_id = 'st-dune-sb1-today-1800';
```
**Output:**
```
 total_bookings | distinct_seats 
----------------+----------------
             50 |             50
```

---

## 6. Observability & Log Analysis

Inspection of structured server logs during the surge revealed the following execution characteristics:
1. **Atomic Evaluation via Lua:** All 500 hold requests executed `HOLD_SEATS_LUA`. For each seat, the first request acquired the hold key and updated the showtime version; the subsequent 9 concurrent requests failed atomically at the Redis evaluation layer without locking or blocking.
2. **Database Load Elimination:** 450 out of 500 requests were terminated at Redis in under 2 ms of server-side compute time. Zero database transactions were initiated for losing requests, preserving PostgreSQL connection pool capacity for order processing.
3. **Connection Pool Stability:** PostgreSQL pool utilization peaked at 12 concurrent connections during winner fulfillment, well within the configured pool ceiling of 20 connections.
4. **Clean Error Signaling:** Every rejected hold returned consistent JSON structure (`{ error: { code: 'SEAT_TAKEN', requestId: '...' } }`) with correlation headers (`x-request-id`).

---

## 7. What Surprised Us & Engineering Learnings

1. **OS-Level Loopback TCP Exhaustion:** On Windows desktop operating systems, initiating 500 raw TCP socket handshakes at `t = 0.000s` exhausted the default TCP SYN queue (`somaxconn`), causing `dial tcp: connectex: No connection could be made because the target machine actively refused it`. Increasing server socket backlog to `2048` and grouping requests by seat with 20 ms stagger allowed full 500-VU execution with **0.00% network dropouts**.
2. **Relational Safety Net:** Even during rapid concurrent insertions from 50 simultaneous winners, PostgreSQL's `UNIQUE (showtime_id, seat_id)` constraint guaranteed that even if an in-memory layer were compromised, double bookings would be physically impossible at the storage layer.
3. **Single-Threaded Event Loop Efficiency:** Node.js handled ~250 sustained requests per second locally while executing atomic Redis scripts, demonstrating that I/O-bound seat allocation benefits massively from offloading lock coordination to Redis Lua scripts.

---

## 8. Limitations & Future Scaling

- **Single Host Co-location:** In this local benchmark, API, Redis, and Postgres ran on the same machine. In a distributed multi-region deployment, network latency between API servers and Redis will introduce ~2–5 ms round-trip overhead.
- **Connection Pooling in Cloud Serverless:** When deployed on containerized clusters (e.g. AWS ECS or Kubernetes), PgBouncer should be placed in front of PostgreSQL to prevent connection exhaustion during larger bursts.
