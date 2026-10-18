# ADR-004: Real-Time Seat Availability via ETag Conditional Polling

## Context
When thousands of mobile app users browse the seat map during a hot ticket drop, they must see seat statuses (available, held by another user, sold) update in near real-time. Persistent WebSocket connections at mobile scale impose high connection state memory, reconnection storms on cellular handover, and load balancer complexity. Full polling without caching wastes cellular bandwidth and exhausts backend serialization resources.

## Decision
We implement a lightweight conditional polling mechanism utilizing HTTP ETags:

1. **3-Second Conditional Polling:**
   - The mobile client queries `GET /v1/showtimes/:id/availability` every 3 seconds while the seat map screen is active.
   - Subsequent poll requests include the `If-None-Match: "{etag}"` HTTP header storing the last received ETag.
   - When the user navigates away or backgrounds the app, polling automatically pauses (`refetchIntervalInBackground: false`).

2. **Atomic Versioned ETags:**
   - Every showtime maintains an integer version counter in Redis (`st:ver:{showtimeId}`).
   - Any seat operation (atomic hold, release, hold expiration, or payment confirmation) atomically increments this version counter (`INCR`).
   - The backend constructs an ETag: `W/"v{version}-{soldCount}"`.
   - If the incoming `If-None-Match` matches the current version, the backend immediately responds with `HTTP 304 Not Modified` and zero payload bytes.

3. **Delta Mapping over Local Geometry:**
   - The server response payload does not serialize 320 full seat objects. It returns compact arrays of IDs: `{ heldSeatIds: string[], soldSeatIds: string[], version: number }` (payload size < 1 KB).
   - The mobile client overlays these dynamic ID sets onto the static hall geometry (`buildHall()`), updating only modified seat chips.

## Consequences
- 95%+ of poll requests during quiet periods return `HTTP 304 Not Modified`, reducing mobile cellular bandwidth and server CPU load by over 90%.
- Real-time seat updates reflect on screen within $\le 3$ seconds of another user holding or buying a seat.
- Zero WebSocket connection state management or zombie connection leaks across mobile cellular dropouts.
