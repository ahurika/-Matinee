# ADR-005: Paystack Checkout, Webhook Processing, Ledger, and Ticket Verification

## Context
Matinee handles real-time cinema ticket bookings under high surge concurrency. When a user checks out, we must guarantee:
1. Money calculations are server-authoritative (integer kobo).
2. Network retries and duplicate webhooks cannot cause double charges, duplicate bookings, or double refunds.
3. Every financial movement is recorded in an immutable, append-only ledger.
4. Ticket QR codes are digitally signed and contain zero personal identifiable information (PII).

## Decision

### 1. Payment Provider Integration & Test Mode
- **Provider**: Paystack (NGN test mode).
- **Authentication**: `PAYSTACK_SECRET_KEY` stored on the server only. Never exposed to the mobile client.
- **Hosted Checkout**: The server initializes transactions (`POST /transaction/initialize`) and receives an authorization URL. The Expo app opens this URL via a secure in-app browser sheet.

### 2. Idempotent Order Creation
- `POST /v1/orders` requires an `Idempotency-Key` HTTP header.
- An `idempotency_keys` table stores `(user_id, key, request_hash, response_status, response_body, status, created_at)`.
- Requests with matching key and matching payload receive the cached response immediately.
- Requests with matching key but altered body are rejected with `422 IDEMPOTENCY_CONFLICT`.
- In-flight requests lock the key, returning `409 REQUEST_IN_PROGRESS` on concurrent collisions.

### 3. Webhook Verification & Background Ingestion
- Webhooks arrive at `POST /v1/webhooks/paystack`.
- **Signature Check**: The raw body string is verified against the `x-paystack-signature` header using `HMAC-SHA512(PAYSTACK_SECRET_KEY, rawBody)` with constant-time comparison (`crypto.timingSafeEqual`).
- Invalid signatures receive `401 Unauthorized` without persisting any database record.
- Valid webhooks are inserted into `webhook_events(provider, event_id, payload, status)` with `ON CONFLICT (provider, event_id) DO NOTHING`.
- The HTTP endpoint returns `200 OK` immediately, and the event is processed idempotently by a background job.

### 4. Booking Fulfillment & Late Webhook Policy
- The webhook processing job attempts to fulfill bookings:
  - Executes `INSERT INTO bookings ... ON CONFLICT (showtime_id, seat_id) DO NOTHING RETURNING seat_id`.
  - **Happy Path**: All seats are claimed -> Order marked `paid`, seat holds released in Redis, seats added to `sold:{st}`, and a `charge` row is written to the ledger.
  - **Late Webhook with Free Seats**: If the hold expired during payment but the seats are still vacant, the booking is honored.
  - **Late Webhook with Taken Seats**: If another user claimed the seats after hold expiry, the booking insert fails due to the database unique constraint. The order is set to `paid_unfulfilled`, a `charge` ledger entry is logged, and an automatic full refund job is queued.

### 5. Append-Only Ledger
- `ledger_entries` stores every monetary transaction: `id`, `order_id`, `type` (`charge` | `refund` | `adjustment`), `amount_kobo`, `currency`, `provider_ref`, `idempotency_key`, `created_at`.
- Database triggers explicitly prohibit `UPDATE` and `DELETE` operations, raising an exception if attempted.

### 6. Signed QR Ticket Tokens
- Ticket QR payload format:
  `token = base64url(bookingId) + '.' + base64url(HMAC_SHA256(TICKET_SIGNING_SECRET, bookingId + ':' + showtimeId + ':' + seatId))`
- The operator verification endpoint `POST /v1/operator/tickets/verify` validates the cryptographic signature, ensures the booking is confirmed, checks that the showtime is not cancelled, and marks the ticket as used (rejecting duplicate scans).

## Consequences
- Zero double bookings are guaranteed even under severe network latency or out-of-order webhooks.
- All financial balances are fully reconcilable from the ledger.
- The mobile application never decides payment outcomes directly.
