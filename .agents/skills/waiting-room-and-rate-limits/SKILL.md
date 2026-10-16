---
name: waiting-room-and-rate-limits
description: Use when building the Matinee waiting room (queue, admission rate, capacity, heartbeat, position), per user and per IP rate limits on hold, checkout, search and join endpoints, overload shedding, and graceful failure messages. Tested reference code in server/src/traffic.
---

# Waiting room, rate limits, and graceful failure

## Idea

A doorman at a club. The room holds 300 people. People walk straight in while there is space. When it is full, a line forms and the doorman lets people in at a steady rate as space frees up. Nobody can push ahead, and the room never overflows.

## Waiting room (`server/src/traffic/waitingRoom.ts`, tested T7)

Two sorted sets per showtime plus a counter:
- `wr:queue:{st}` members = userId, score = join number (exact order)
- `wr:active:{st}` members = userId, score = time the admission expires (ms)
- `wr:seq:{st}` the join counter

**Join** (one Lua step): drop expired admissions. If the user is active, extend their admission (this is the heartbeat). If there is no line and room under capacity, admit now. Otherwise add to the queue (keeping their place if they are already queued) and return their position.

**Tick** (one Lua step, about once per second by a worker): drop expired admissions, compute free room, admit `min(ratePerTick, free)` people from the front of the queue.

Parameters (start values, justify in `docs/TRAFFIC.md`): capacity 300 active per showtime, 20 admitted per second, admission lasts 120 seconds, heartbeat every 30 seconds.

Why these numbers: capacity is what one showtime's seat endpoints can serve comfortably (polling every 3 s is about 100 requests per second of cheap 304s plus hold writes). Admission rate stops a stampede when many admissions expire at once. Admission lifetime frees the room if someone closes the app.

### Endpoints

```
POST /v1/showtimes/:id/waiting-room/join    -> { state: 'ACTIVE' | 'QUEUED', position, estimatedWaitSec }
GET  /v1/showtimes/:id/waiting-room/status  -> same shape, cheap, polled every 2 s while queued
```
`estimatedWaitSec = ceil(position / ratePerTick)` (a rough guide, say "about"). Seat endpoints return 403 `NOT_ADMITTED` if the room is enabled for that showtime and the user is not active.

Users with a live hold keep access until the hold expires: refresh their admission when a hold is created.

### App behaviour

Queued screen: position, rough wait, "Keep this screen open", "Leave line" (with a confirmation). Poll status every 2 seconds. When `ACTIVE`, a short check animation then go to the seat map. On app resume, call join again (same place is kept). Never show a spinner without text.

## Rate limiting (`server/src/traffic/rateLimit.ts`, tested T8)

Redis fixed window using an atomic Lua script, so a crash cannot leave a counter without an expiry. Per user and per IP, because bots can have many accounts and shared Wi-Fi can have many users.

| Route | Per user per minute | Per IP per minute |
|---|---|---|
| `PUT /hold`, `DELETE /hold` | 20 | 120 |
| `POST /orders` | 5 | 30 |
| `GET /movies/search` | 30 | 120 |
| `POST /waiting-room/join` | 10 | 60 |
| `GET /availability` | 30 (a 3 s poll is 20) | 300 |
| Login and register | 5 failures per 15 min per email | 20 per 10 min |

Return **429** with `Retry-After` and the code `RATE_LIMITED`. Client IP: read the forwarded header only from the host's trusted proxy.

## Overload shedding (graceful failure)

Reject early instead of falling over:
- If the DB pool wait exceeds about 1 second or event loop lag is high, return **503** `SERVICE_UNAVAILABLE` with `Retry-After` for hold and join requests.
- If the room is full and the queue is huge, return `ROOM_FULL` for new joins with a retry hint.
- Webhooks and order status endpoints are never shed (money first).

App: on 429 or 503 show the message from `toUxMessage` and a Retry button. The seat map keeps the last known availability and shows a banner. No crash, no blank screen.

## When Redis is down

Rate limits and the waiting room cannot run in Redis. Use a small per-instance emergency limiter (in memory, documented as a degraded mode only), keep the database hold fallback, and tell new entrants "very busy, try again in a few seconds" instead of queueing them.

## Tests

T7 and T8 exist and pass: 1000 arrivals (100 walk in, 900 queue with unique ordered positions), full room admits nobody until expiry, then admits in join order at the fixed rate, capacity is never exceeded, joining twice keeps the place, heartbeat extends admission, 500 parallel hits allow exactly the limit. Add: endpoint tests for 429 and 503 shape and `Retry-After`.

## Explain-back questions for the human

1. Why does the waiting room only appear when the room is full?
2. Why limit both per user and per IP?
3. What would happen at 10:00:00 with no waiting room and no rate limits?
