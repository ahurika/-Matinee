---
name: realtime-seat-availability
description: Use when building near real-time seat availability for Matinee: the availability endpoint with ETag and 304, the Redis version counter, app polling every 3 seconds, and the written justification for polling versus Server-Sent Events versus WebSockets.
---

# Near real-time seat availability

## Decision: poll every 3 seconds with an ETag

Write this reasoning in `docs/TRAFFIC.md` in your own words.

| Option | What it costs | Verdict |
|---|---|---|
| Polling (3 s) + ETag + 304 | A tiny request per user. When nothing changed the server answers 304 with no body. Simple, works through every proxy, survives flaky mobile networks, no connection state to manage | **Chosen** |
| Server-Sent Events | One long-lived connection per user (about 300 per showtime). Very efficient fan-out with Redis pub/sub, but many open connections strain free hosts and every reconnect needs resync logic | Upgrade path if polling load becomes the bottleneck |
| WebSockets | Two-way channel, more infrastructure (sticky sessions or a pub/sub layer), more security surface. We only need server-to-client, so the extra power is wasted | Rejected |

Why polling is safe here: the waiting room caps active users per showtime at 300, so the polling load is bounded at about 100 requests per second, and nearly all are cheap 304s that read one Redis number.

## Server

State in Redis (all maintained inside the tested Lua scripts): `sold:{st}` (set), `holdidx:{st}` (sorted set, score = hold expiry), `ver:{st}` (integer bumped on every hold, release, or booking).

```
GET /v1/showtimes/:id/availability
  If-None-Match: "v42"
1. read ver:{st}. If it equals the client's version -> 304 (no body)
2. else read held = ZRANGEBYSCORE holdidx:{st} now +inf, sold = SMEMBERS sold:{st}
3. return 200 { held: [...], sold: [...], version: 42 } with ETag: "v42"
```

`readAvailability` in `redisHolds.ts` does step 2 (tested). Expired holds drop out automatically because they are filtered by score. Add `Cache-Control: no-cache` and `Vary: Authorization` as needed. Seat counts for the showtimes list ("filling fast") can come from the same data, cached for a few seconds.

Seats held by the **current user** are in `held` too. The app knows its own seats from the hold session and shows them as selected, not as someone else's.

## App

- Poll only while the seat screen is focused and the app is in the foreground. Stop on blur or background.
- Send `If-None-Match` with the last ETag. A 304 changes nothing, no re-render.
- Merge availability into the seat list. Only seats whose status changed re-render (seats are memoized).
- Use a short fade when a seat changes to held or sold, so the change is noticed but calm.
- If a poll fails, keep the last data, show a small "Reconnecting" note after 2 failures, and back off (3 s, 6 s, 12 s, max 15 s).
- If the user's selected seat becomes held or sold by someone else, unselect it and show a toast ("Someone just took F7").

## Cost you can quote in the interview

At 300 active users, 3 second polls: 100 requests per second. Each does one Redis `GET` and returns 304. Versus SSE: 300 open connections with a Redis subscription and fan-out writes on each change. Versus WebSockets: the same connections plus a two-way protocol you do not need.

## Tests

T18: availability returns 304 when nothing changed, 200 with the new ETag after a hold, release, or booking, and held seats disappear after expiry (the expiry test exists in `seats.race.test.ts`). App test: a polled response that marks the user's own selected seat as held by someone else unselects it.

## Explain-back questions for the human

1. Why use polling, WebSockets, or SSE? What does each cost?
2. What is an ETag and why does 304 matter at 300 users?
3. Why does the waiting room make polling safe?
