# ADR-003: TMDB API Terms, Attribution, and Caching Strategy

## Context
Matinee integrates with The Movie Database (TMDB) to provide film metadata, poster artwork, backdrops, cast information, and search capability. TMDB has explicit terms of use regarding attribution, brand guidelines, caching duration, rate limits, and commercial vs. non-commercial use.

## Decision

### 1. Attribution & Logo Rules
- **Attribution Statement**:
  "This product uses the TMDB API but is not endorsed or certified by TMDB."
- **Logo Placement**:
  - The TMDB logo must appear on the Account, About, and Credits screen within the mobile app, as well as in the project `README.md`.
  - The TMDB logo must be visually subordinate to the primary Matinee branding (never larger or more prominent than the Matinee logo).
  - The official TMDB primary logo or primary green short logo will be used without alteration, distortion, or color shifts.

### 2. Caching Duration & Limits
- **Policy**: TMDB permits caching API responses locally to enhance performance and reduce server load, provided the cache is refreshed periodically and does not store user data without consent.
- **TTL Hierarchy in Matinee**:
  | Resource | Fresh TTL | Stale TTL | Rationale |
  |---|---|---|---|
  | Now Playing (`/movie/now_playing`) | 6 hours | 7 days | Film lineup changes weekly; fresh enough for active bookings |
  | Upcoming (`/movie/upcoming`) | 12 hours | 7 days | Release calendars rarely shift day-to-day |
  | Movie Detail (`/movie/:id`) | 24 hours | 7 days | Metadata and cast are largely static once published |
  | Movie Search (`/search/movie`) | 10 minutes | 10 minutes | Ephemeral user queries |
  | Configuration / Genres | 24 hours | 7 days | Image base URLs and genre taxonomy are long-lived |
- **Single Flight**: Cold cache misses use atomic Redis locks (`lock:{key} NX PX 10000`) so that a burst of 5,000 concurrent mobile users results in exactly 1 call to TMDB while others await the cached result.

### 3. Rate Limits & Upstream Resilience
- TMDB requests are gated on our backend:
  - 429 responses trigger automatic backoff honoring the `Retry-After` header when present.
  - Exponential backoff with jitter is applied to 5xx errors and network drops (max 3 attempts).
  - Circuit breaker: 5 consecutive failures opens the circuit for 30 seconds, falling back immediately to the stale cache copy (`stale: true`).
  - Database fallback: `movie_snapshots` in PostgreSQL retains the last known mapped payload for all films with active showtimes.

### 4. Commercial vs. Non-Commercial Licensing
- The free TMDB API tier is restricted to non-commercial use, testing, educational, and developer evaluation purposes.
- For this project (a graduation portfolio demonstrating system resilience and test-mode booking), the free API tier is compliant.
- If deployed commercially to sell real-world cinema tickets with live payment processing, a commercial API agreement with TMDB must be executed prior to public store release. This requirement is documented in the project `README.md`.

## Consequences
- The client app never communicates directly with TMDB; all requests route through `tmdbClient.ts`.
- The system continues operating seamlessly during TMDB downtime or rate limit events by serving stale cache copies and database snapshots.
