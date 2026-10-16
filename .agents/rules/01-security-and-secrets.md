# Rule 01: Security and secrets

**Activation:** Always On.

## Core idea

Anything inside the mobile app is public. Anyone can unzip the Android build, read the bundle, or call the API with Postman. The app only displays what the server allows. The server decides: who the user is, what a seat costs, whether a seat is free, whether a payment succeeded.

## Secrets

1. Never write a real key, token, password, or database URL into a committed file.
2. Server secrets live in server environment variables. Local development uses an untracked `.env`. Commit `server/.env.example` and `app/.env.example` with names only.
3. Server only: `TMDB_READ_ACCESS_TOKEN`, `PAYSTACK_SECRET_KEY`, `JWT_ACCESS_SECRET`, `REFRESH_TOKEN_PEPPER`, `TICKET_SIGNING_SECRET`, `OPERATOR_API_KEY`, `DATABASE_URL*`, `REDIS_URL`.
4. Allowed `EXPO_PUBLIC_` variables: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SENTRY_DSN_APP`, `EXPO_PUBLIC_EAS_PROJECT_ID`. Anything else needs a note in `PRD.md` Appendix A explaining why it is safe.
5. The TMDB token never reaches the app. The app never calls TMDB or builds TMDB image URLs. The backend returns ready-to-use image URLs.
6. If a secret is ever committed, deleting the file is not enough. Rotate it at the provider.

## Server-side authority

1. Never accept `price`, `amount`, `fee`, `total`, `status`, or `userId` from the client. Prices come from the showtime row. The user comes from the token.
2. The client sends seat ids. The server checks the seats belong to that showtime's screen.
3. A hold belongs to the user who made it. Only that user can release, extend, or order against it.
4. Operator endpoints require `OPERATOR_API_KEY` in a header, compared in constant time. They are rate limited and logged.
5. Return 404 for orders and tickets that belong to someone else. Do not confirm they exist.
6. Login and password reset errors stay generic.

## Input validation

Validate body, query, and params with Zod on every route (`.strict()`). Set maximum lengths and ranges (seat list max 8, page sizes max 50). Parameterised SQL only. No string-built SQL.

## Tickets

QR tokens are signed with `TICKET_SIGNING_SECRET` (HMAC-SHA256) and carry only the ticket id and a signature. Verification happens on the server. Compare signatures in constant time.

## Tokens and storage

Argon2id for passwords. 15 minute access token. Rotating refresh token with reuse detection (reuse the Rota auth code). Tokens only in `expo-secure-store`. Never AsyncStorage.

## Logging

Log request id, user id, route, status, duration. Never log tokens, passwords, webhook signatures, or payment payloads. Never log full TMDB responses.

## Review checklist (before every commit touching an endpoint)

- [ ] Zod schema present and strict
- [ ] Auth present, ownership checks present
- [ ] No client-supplied price, status, or user id trusted
- [ ] No secret in code, logs, or the app
- [ ] Rate limit applied where the endpoint is sensitive
- [ ] Test for the forbidden case, not only the happy case
