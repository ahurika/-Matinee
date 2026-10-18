# ADR-006: User Authentication, Argon2id Hashing, and Refresh Token Rotation

## Context
Mobile cinema ticket buyers must securely log in, retain active sessions across app restarts, and safely perform payments without risking token leakage. Long-lived access tokens represent an unacceptable attack surface if intercepted, while refresh tokens must be protected against replay attacks and theft.

## Decision
We implement a zero-trust mobile token rotation architecture:

1. **Argon2id Password Storage:**
   - User passwords must be at least 10 characters long.
   - Passwords are hashed using Argon2id (memory: 64 MB, time: 3 iterations, parallelism: 4 threads).
   - Login endpoints return uniform generic error messages (`401 Invalid credentials`) with identical response times to eliminate user enumeration timing attacks.

2. **Dual-Token Lifecycle:**
   - **Access Token:** Short-lived (15 minutes). Signed with HMAC-SHA256 containing `userId`, `email`, and `token_version`. Validated statelessly on incoming requests.
   - **Refresh Token:** Long-lived (30 days). Cryptographically random 256-bit token stored in PostgreSQL as `SHA-256(refreshToken + REFRESH_TOKEN_PEPPER)`.

3. **Single-Use Rotation & Token Family Revocation:**
   - Every refresh operation (`POST /v1/auth/refresh`) invalidates the used refresh token and issues a brand-new access/refresh token pair associated with the same `family_id`.
   - **Token Reuse Detection:** If an already-rotated refresh token is ever submitted, the server detects potential token compromise (`AuthReuseDetected`), revokes the entire token family immediately, and terminates all active sessions for that device.

4. **Global Invalidation (`logout-all`):**
   - The user record stores an integer `token_version`.
   - `POST /v1/auth/logout-all` increments `token_version` in PostgreSQL. Subsequent API requests bearing older JWTs fail immediately with `401 Unauthorized`, providing instant cross-device revocation without waiting for the 15-minute JWT expiration window.

5. **Client-Side Keychain Storage:**
   - On iOS and Android, tokens are saved in hardware-backed encrypted storage via `expo-secure-store` (iOS Keychain and Android Keystore).
   - On Web, tokens are persisted in browser `localStorage` with in-memory fallback.

## Consequences
- Compromised access tokens expire automatically within 15 minutes.
- Stolen refresh tokens are rendered useless and trigger automatic breach containment upon first replay.
- High mobile usability with seamless background token refreshing during seat booking flows.
