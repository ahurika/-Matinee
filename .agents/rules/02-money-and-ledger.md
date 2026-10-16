---
trigger: glob
globs: server/src/orders/**`, `server/src/payments/**`, `server/src/webhooks/**`, `server/src/jobs/**`. Also Model Decision.
---

# Rule 02: Money, payments, refunds, and the ledger

**Activation:** Glob `server/src/orders/**`, `server/src/payments/**`, `server/src/webhooks/**`, `server/src/jobs/**`. Also Model Decision.

## Money

1. All money is integer kobo. No floats, no decimals, no `Math.round` on money.
2. Every amount is stored with `currency` (default `NGN`). Format to naira only at the UI edge.
3. Prices and fee rules live in one file: `server/src/config/pricing.ts`.
4. Fee: `max(5000, floor(subtotal * 5 / 100))` kobo. Pure function, no I/O, no `Date.now()`. Table-driven tests with 8 or more cases (see `checkout-webhooks-refunds-ledger` skill).

## Who decides success

1. The app never decides whether a payment succeeded.
2. Only a verified webhook (signature checked on the raw body) or a server-side verify call confirms a payment.
3. On every webhook, compare amount and currency with the stored `payment_attempts` row. A mismatch never creates a booking. Log it and alert.
4. The app shows "Confirming payment" until the order status changes on the server.

## Idempotency

1. `POST /orders` requires an `Idempotency-Key` header (UUID). Store key, request hash, and response. Same key and same request returns the stored response. Same key and a different request returns 422.
2. Webhook events are stored with a unique `(provider, event_id)`. A duplicate returns 200 and does nothing else.
3. Ledger rows have a unique `idempotency_key` (for example `charge:<orderId>`, `refund:<orderId>`), so a job that runs twice cannot write twice.

## Ledger

1. Every charge, refund, and adjustment is one row in `ledger_entries`.
2. Never UPDATE or DELETE a ledger row. A database trigger blocks both. Fix mistakes with a new `adjustment` row.
3. Write the ledger row in the same transaction as the booking or refund state change.

## Webhook job (one transaction, idempotent)

1. Load event and order. If the event is already processed, return.
2. Verify amount and currency.
3. Insert `bookings` rows with `ON CONFLICT DO NOTHING RETURNING`. The unique `(showtime_id, seat_id)` constraint is the final authority.
4. All seats inserted: order `paid`, ledger charge row, add seats to the `sold:{st}` set, delete the holds (compare-and-delete), enqueue confirmation.
5. Any seat missing: roll back the inserts, order `paid_unfulfilled`, enqueue a full refund job.
6. A webhook that arrives after the hold expired follows the same steps. Nothing depends on the hold still existing.

## Refunds

1. Refund jobs are idempotent per order.
2. Cancelled showtime: operator endpoint marks the showtime cancelled, enqueues one refund job per paid order. Each job refunds through the provider, writes a ledger refund row, marks bookings `cancelled`, notifies the user.
3. Never refund an order twice. The unique ledger key enforces this.

## Never

- Never store card data. The provider's hosted checkout handles it.
- Never trust a redirect URL as proof of payment.
- Never parse the webhook body before verifying the signature. Use the provider's current documented method (Paystack signs the raw body with HMAC SHA-512 and sends it in `x-paystack-signature`; confirm in the current docs).
- Never cache payment status or ledger data.
