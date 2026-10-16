# Matinee Traffic Management, Waiting Room & Rate Limiting (TRAFFIC.md)

## 1. Traffic Control Philosophy

In a high-demand cinema ticketing platform, ticket opening for a major blockbuster exhibits an extreme traffic profile: thousands of eager users converge within the first 60 seconds to secure the best seats. Uncontrolled surges will quickly saturate database connections, cause thread lock contention, and degrade the user experience.

Matinee's traffic architecture is built on three core pillars:
1. **Never Let Uncontrolled Traffic Touch the Database:** All concurrency arbitration occurs in Redis via atomic Lua scripts.
2. **Deterministic Gatekeeping (The Waiting Room):** When demand exceeds hall capacity, excess users are held in a transparent virtual waiting room and admitted at a measured cadence.
3. **Graceful Degradation:** When limits are reached, the system responds immediately with clear, friendly error messages and HTTP `Retry-After` headers rather than hanging or timing out.

---

## 2. Parameter Reference & Rationale

| Parameter | Configured Value | Engineering Rationale & Justification |
|---|---|---|
| **Hold Duration** | 10 minutes (600,000 ms) | Provides users sufficient time to select seats, review pricing, enter card details, and complete 3D-Secure 2FA without panic, while ensuring unpurchased seats are released promptly back to the public pool. |
| **Payment Grace Extension** | $\ge$ 7 minutes from order creation | If a user reaches the checkout screen at minute 9 of their hold, creating an order extends their seat lock window to guarantee Paystack checkout cannot fail due to hold expiration mid-payment. |
| **Max Seats per Order** | 8 seats | Protects against scalping bots attempting to monopolize entire rows, while accommodating families and group cinema outings. |
| **Waiting Room Capacity** | 300 active users per showtime | Matches the size of a standard cinema screen (320 seats). Allowing more than 300 users into the active seat map simultaneously creates severe contention for a rapidly dwindling pool of remaining seats. |
| **Admission Rate** | 20 users / second | Releases users from the queue in controlled batches of 20 every 1 second. This smooths out incoming HTTP connection spikes and keeps Redis operation latency under 2 ms. |
| **Admission Ticket Lifetime** | 120 seconds | Once admitted, a user has 2 minutes to enter the seat selection screen. |
| **Heartbeat Interval** | 30 seconds | Active users send a lightweight background heartbeat every 30s. If a user closes their browser or app, their slot is reclaimed after 60s of inactivity to admit the next queued user. |
| **Availability Polling** | Every 3 seconds | Balances near-real-time seat visibility against mobile network battery consumption. Employs conditional `If-None-Match` HTTP headers; unchanged maps return `304 Not Modified` with zero body transfer. |
| **Queue Status Polling** | Every 2 seconds | Provides responsive feedback on queue position and estimated wait time while minimizing polling strain on the waiting room endpoint. |

---

## 3. Rate Limiting Matrix

Rate limits are enforced at the API gateway layer using Redis sliding window algorithms:

| Endpoint | Limit (Per User / min) | Limit (Per IP / min) | Strategy & Purpose |
|---|---|---|---|
| **`PUT /v1/showtimes/:id/hold`** | 20 req/min | 120 req/min | Restricts seat-hopping bots; allows normal users to toggle selections freely. |
| **`POST /v1/orders`** | 5 req/min | 30 req/min | Prevents rapid abandoned checkout creation while protecting payment gateway API limits. |
| **`POST /waiting-room/join`** | 10 req/min | 60 req/min | Blocks queue-stuffing scripts from reserving artificial slots. |
| **`GET /v1/movies/search`** | 30 req/min | 120 req/min | Protects full-text search backend and database read pools from scraping attacks. |

---

## 4. Availability Polling & ETag Optimization (T18)

During a surge, hundreds of users view the seat map simultaneously, generating hundreds of requests per second to `GET /v1/showtimes/:id/availability`.

To prevent bandwidth and compute waste:
1. Every successful seat hold, seat release, or booking increment advances an integer `showtime_version` counter in Redis:
   ```redis
   INCR version:showtime:{id}
   ```
2. The availability endpoint returns an ETag header based on this version:
   ```http
   ETag: "v14"
   Cache-Control: no-cache
   ```
3. On subsequent 3-second polls, the client sends `If-None-Match: "v14"`. If no holds or sales occurred, the server immediately returns `HTTP 304 Not Modified` without querying seat states or serializing JSON payloads.
4. When a seat changes state, the version increments to `v15`, the ETag mismatches, and the client receives the updated diff.
