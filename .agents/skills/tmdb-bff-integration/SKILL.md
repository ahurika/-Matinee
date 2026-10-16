---
name: tmdb-bff-integration
description: Use when building or changing anything that touches movie data in Matinee: the TMDB backend-for-frontend, the single tmdbClient.ts file, Zod mapping into our own types, Redis caching with fresh and stale copies, retry with backoff, circuit breaker, single flight, stale mode, attribution, and TMDB terms. Reference code in server/src/integrations/tmdb is tested (test T15).
---

# TMDB backend for frontend

## Why

The app never calls TMDB. All calls go through our backend, so the API key stays secret, we control caching (a surge of 5,000 users must not mean 5,000 TMDB calls), and we can survive TMDB being slow, rate limited, or down. The app also never sees TMDB's data shape, so a TMDB change cannot break the app.

## Before coding (self-study, 30 minutes)

1. Create a TMDB account and get an **API Read Access Token** (a Bearer token). Put it in `TMDB_READ_ACCESS_TOKEN` on the server only.
2. Read TMDB's current terms of use, API FAQ, and attribution guidelines. Write `docs/decisions/ADR-003-tmdb-terms.md` with: the exact attribution wording, logo rules and placement, caching limits (one secondary source says data may be cached for a limited period and must be refreshed, so check the official text), rate limit guidance, and commercial-use rules (the free API is for non-commercial use, a ticket seller is commercial, so say in the README that production needs a commercial agreement).
3. Check the current endpoints you use: now playing, upcoming, movie details with `append_to_response=credits`, search, and the configuration for image base URLs. Confirm `IMAGE_BASE` and sizes against the live `/configuration` response.

## The one-file rule

`server/src/integrations/tmdb/tmdbClient.ts` is the only file that imports or mentions TMDB field names (`poster_path`, `vote_average`, and so on). Everything else uses `Movie`, `MovieDetail`, and `CastMember`. Add a test or a lint rule that greps for `poster_path` outside that folder.

Mapping rules (already implemented and tested):
- Zod `safeParse` per item with optional fields and defaults. Unknown fields pass through.
- A renamed or missing field gives a default (`posterUrl: null`, `title` falls back to `name` or `original_title`).
- An item without an id is dropped. It never crashes a list.
- The backend builds image URLs. The app only receives ready URLs.

## Caching (Redis, `cache.ts`)

| Data | Fresh TTL | Stale kept | Key |
|---|---|---|---|
| Now playing | 6 h | 7 days | `fresh:movies:now` |
| Upcoming | 12 h | 7 days | `fresh:movies:upcoming` |
| Movie detail | 24 h | 7 days | `fresh:movie:<id>` |
| Search | 10 min | none | `fresh:search:<normalized query>` |
| Config and genres | 24 h | 7 days | `fresh:tmdb:config` |

`getCached` does cache-aside with a **fresh** copy (TTL) and a **stale** copy (long TTL):
1. Fresh hit: return it.
2. Miss: one caller takes a lock (`SET lock:key NX PX`) and loads. Others wait up to 2 seconds for the fresh copy (**single flight**).
3. Loader fails: return the stale copy with `stale: true`.
4. Nothing to serve: throw, and the route returns `MOVIES_UNAVAILABLE`.

Last-resort fallback: a `movie_snapshots` table stores the last mapped data for every film that has showtimes. If Redis and TMDB are both down, showtimes pages still show titles and posters.

## Failure handling (`TmdbClient`)

- Retry up to 3 attempts, delays about 300 ms then 900 ms plus jitter. Retry network errors, 429 and 5xx. Do not retry other 4xx.
- On 429, wait for `Retry-After` seconds when present.
- Circuit breaker: 5 consecutive failed requests opens it for 30 seconds (calls fail fast and stale data is served), then one trial request is allowed.
- All TMDB calls from the app's point of view are cache reads. Only a background refresh job or a cold miss calls TMDB.

## Routes

```
GET /v1/movies/now-playing   -> { items: Movie[], stale: boolean }
GET /v1/movies/upcoming      -> same
GET /v1/movies/:tmdbId       -> { item: MovieDetail, stale: boolean }
GET /v1/movies/search?q=     -> { items: Movie[] }   rate limited, q trimmed, min 2 chars, max 80
```

Warm the caches with a repeatable BullMQ job (`tmdb` queue) every few hours so users rarely hit a cold key.

## What the user sees when TMDB is down (interview question 4)

Cached lists and details still load. The app shows a quiet note "Showing saved details" (when `stale: true`). Showtimes, seat maps, and booking are unaffected because they live in our database. If a movie was never cached, the detail screen shows the snapshot from our database. Only a completely unknown film shows the `MOVIES_UNAVAILABLE` message with Retry.

## Attribution (required)

On the Account, About and credits screen, show TMDB's required notice and approved logo exactly as their current terms say, less prominent than the Matinee name. Add the same in the README. Re-read the live text before submitting.

## Tests (T15, already written and passing)

Mapping survives renamed fields, junk items are dropped, retry then success, `Retry-After` honored, 404 not retried, circuit opens and stops calling TMDB, stale served when TMDB is down, 50 concurrent cold requests make one TMDB call. Add: a route test that returns `stale: true`, and a grep test for the one-file rule.

## Explain-back questions for the human

1. Why does the app not call TMDB directly? Name three reasons.
2. What do "fresh" and "stale" copies buy you?
3. What does single flight prevent, and what happens without it at 5,000 users?
