---
name: checkout-webhooks-refunds-ledger
description: Use when building Matinee order creation, price and service fee calculation, Paystack test checkout, idempotency keys, webhook verification and the background job that confirms bookings, late webhooks, abandoned payments, refunds for cancelled showtimes, the append-only ledger, and signed QR tickets. Proof tests T9 to T14 and T17. Pricing code in server/src/config/pricing.ts is tested (T11).
---

# Checkout, webhooks, refunds, and the ledger

## Golden rules

1. Money is integer kobo. The server computes every price and fee. The client sends seat ids only.
2. The app never decides a payment succeeded. A verified webhook (processed in a background job) decides.
3. Every step is idempotent. Networks retry, providers resend webhooks, jobs run twice.
4. The database unique constraint on `bookings (showtime_id, seat_id)` is the final authority on who gets a seat.

## Check the provider first (self-study, at the start of M4)

Read the current Paystack docs (or Flutterwave if you chose it). Answer and record in `ADR-005`: does NGN test checkout work on your account, how are webhooks signed (Paystack: HMAC SHA-512 of the raw body with your secret key in the `x-paystack-signature` header, confirm in current docs), which field is a unique event id (if none, build one from event type plus transaction reference), how refunds are created in test mode, and the webhook URL rules (a public URL is needed, so use the deployed backend or a tunnel). If the provider is slow to set up, keep a local **signed webhook simulator** script so the whole flow is still provable (use the same signature code path).

## Pricing (`server/src/config/pricing.ts`, tested)

`priceOrder(kinds)` returns subtotal, fee, total, currency. Fee is `max(5000, floor(subtotal * 5 / 100))`. Seat kinds come from the database (`seats.kind`), never from the request. Tests T11 cover 6 order cases, the minimum fee, flooring, and invalid counts.

## Create the order (`POST /v1/orders`, header `Idempotency-Key`)

```
1. Idempotency: insert (userId, key, requestHash) with status in_progress. Same key and same body returns the stored response.
   Same key with a different body returns 422 IDEMPOTENCY_CONFLICT. In progress returns 409 REQUEST_IN_PROGRESS.
2. Load the user's hold session. No hold or expired -> 409 HOLD_EXPIRED.
3. Read seats and kinds from the database for those seat ids and this showtime's screen.
4. priceOrder(kinds) -> subtotal, fee, total.
5. BEGIN: insert orders (status pending, hold_id, hold_expires_at), order_seats (price per seat), payment_attempts (amount, currency, provider_ref = our reference). COMMIT.
6. Extend the hold to at least 7 minutes (payment grace, extendSeats).
7. Ask the provider to initialise a hosted checkout with our reference, amount (total kobo), callback and metadata (orderId). Store the result.
8. Return { orderId, checkoutUrl, expiresAt }. Save the response for the idempotency key.
```
Rate limit: 5 per user per minute. Never call the provider inside an open database transaction.

## Webhook endpoint (`POST /v1/webhooks/paystack`) (T9)

```
raw = await c.req.raw.text()                      // RAW body, before JSON parsing
verify signature, constant-time compare           // bad -> 401, write nothing, log warn
event = JSON.parse(raw); eventId = <unique id>
INSERT INTO webhook_events(provider, event_id, payload, status)
  VALUES ('paystack', eventId, event, 'received') ON CONFLICT DO NOTHING RETURNING id
if inserted: queue.add('process-webhook', { id, requestId })
return 200                                         // also 200 for duplicates
```

## Webhook job (idempotent, one transaction)

```
load webhook_events row. If processed -> return
BEGIN
  attempt = SELECT ... FROM payment_attempts WHERE provider_ref = $ref FOR UPDATE
  not found -> mark event ignored, COMMIT, return
  if event is success:
     verify amount and currency equal the attempt. Mismatch -> attempt amount_mismatch, alert, COMMIT, return
     for each seat in order_seats: INSERT INTO bookings(...) ON CONFLICT (showtime_id, seat_id) DO NOTHING RETURNING seat_id
     if every seat was inserted:
        orders.status = 'paid'; attempt 'succeeded'
        INSERT ledger_entries(type 'charge', idempotency_key 'charge:' || orderId, ...)
        COMMIT
        after commit: SADD sold:{st} seats; compare-and-delete the holds (releaseSeats); bump version; enqueue confirmation
     else:
        ROLLBACK the inserts; orders.status = 'paid_unfulfilled'; ledger charge row; enqueue refund-order job
  if event is failure: attempt failed, orders.status = 'failed', release holds
  webhook_events.status = 'processed'
COMMIT
```

### Late webhook (interview question 5, test T12)

The job never checks whether the hold still exists. It tries the inserts. Hold expired but seats still free: the customer gets the seats. Seats taken by someone else: the unique constraint makes the insert conflict, the job marks the order `paid_unfulfilled` and refunds in full automatically, and the app shows `PAYMENT_LATE_REFUNDED`.

## Abandoned or failed payments (T13)

- Failure webhook or user cancels: release holds at once.
- User just leaves: the hold expires. The `holds` sweeper job marks the pending order `expired`.
- A success webhook arriving for an `expired` order follows the late-webhook path above.

## Refunds for a cancelled showtime (T14)

```
POST /v1/operator/showtimes/:id/cancel   (header X-Operator-Key, constant-time compare)
  showtimes.status = 'cancelled'; for each paid order enqueue refund-order { orderId } (job id = 'refund:' + orderId)
refund-order job (idempotent):
  skip if a ledger row 'refund:<orderId>' exists
  call the provider refund API with our reference (use the provider idempotency feature if it exists)
  BEGIN: ledger_entries(type 'refund', amount, idempotency_key 'refund:' || orderId); bookings -> 'cancelled'; orders -> 'refunded'; COMMIT
  notify the user (email or in-app), app shows SHOWTIME_CANCELLED on the ticket
```
Running the cancel endpoint twice must not refund twice.

## Ledger (T17)

`ledger_entries(id, order_id, type, amount_kobo, currency, provider_ref, idempotency_key unique, created_at)`. Types `charge`, `refund`, `adjustment`. A trigger blocks UPDATE, DELETE, and TRUNCATE:

```sql
CREATE FUNCTION ledger_no_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'ledger_entries is append-only'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER ledger_no_update BEFORE UPDATE ON ledger_entries FOR EACH ROW EXECUTE FUNCTION ledger_no_mutation();
CREATE TRIGGER ledger_no_delete BEFORE DELETE ON ledger_entries FOR EACH ROW EXECUTE FUNCTION ledger_no_mutation();
```
Reconciliation query for the docs: per order, charges minus refunds equals what the customer paid minus what we returned.

## Tickets and QR

Ticket code per booking: `ticketId = booking.id`; `token = base64url(ticketId) + '.' + base64url(HMAC_SHA256(TICKET_SIGNING_SECRET, ticketId + ':' + showtimeId + ':' + seatId))`. The QR holds only this token. `POST /v1/operator/tickets/verify` recomputes the signature in constant time, checks the booking is `confirmed`, the showtime is not cancelled, and marks first use (second scan returns "already used"). No names or emails inside the code.

## App flow

Create order (with a fresh `Idempotency-Key` per payment attempt, reused on retry) -> open `checkoutUrl` in `expo-web-browser` -> return deep link -> "Confirming payment" polling `GET /orders/:id` every 2 s for up to 60 s -> `paid`: success haptic, confirmation animation, ticket. `paid_unfulfilled` or `failed`: show the matching message from `errorMessages.ts`.

## Tests to write (T9 to T14, T17)

Bad signature (401, nothing written), same event three times (one booking set, one ledger row), idempotent order create, price table, late webhook with free seats and with taken seats, abandoned payment releases seats, cancelled showtime refunds each paid order once, ledger UPDATE and DELETE raise.

## Explain-back questions for the human

1. A user pays but the webhook arrives 20 minutes late after the hold expired. What happens, and why?
2. What stops a double charge or a double booking from a retried request?
3. Why does the job insert bookings first and refund only if the insert conflicts?
