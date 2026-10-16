# Matinee: Cinema Ticket Booking Platform

> A cinema ticket booking mobile application engineered for high-concurrency seat reservation integrity, atomic holds, resilient BFF caching, and verified webhook financial settlements.

[![Tests](https://img.shields.io/badge/tests-63%20passed%20(3%2F3%20runs)-brightgreen)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)](#)
[![Load Test](https://img.shields.io/badge/k6%20500%20VUs-0%20double%20bookings-success)](#)

---

## 1. Quick Links & Artifacts

- **GitHub Repository:** [https://github.com/ahurika/-Matinee](https://github.com/ahurika/-Matinee)
- **Android Dev Build APK:** [Download Android Development Build](https://expo.dev/artifacts/eas/matinee-dev-client.apk)
- **Deployed Backend URL:** `https://api.matinee.app` (Staging: `http://localhost:3000`)
- **Figma Design System & Screens:** [Matinee Design Tokens & Screen Flows (Figma)](https://figma.com/@kate/matinee-design-system)
- **Architecture Documentation:** [`docs/ARCHITECTURE.md`](file:///c:/Users/USER/Desktop/Matinee/docs/ARCHITECTURE.md)
- **Load Test Report (500 VUs):** [`load-tests/REPORT.md`](file:///c:/Users/USER/Desktop/Matinee/load-tests/REPORT.md)
- **Component Library Specs:** [`docs/COMPONENTS.md`](file:///c:/Users/USER/Desktop/Matinee/docs/COMPONENTS.md)
- **Living Gallery Route:** Open the mobile app $\rightarrow$ **Account** tab $\rightarrow$ long-press the version number (`v1.0.0-rc2`).

---

## 2. The Core Problem: Concurrency & Booking Integrity

When a major cinema blockbuster opens, thousands of moviegoers compete for the same seats in the exact same minute. A standard relational database performing "check-then-set" queries under high concurrency will encounter race conditions leading to fatal double bookings.

### How Matinee Guarantees Zero Double Bookings:
1. **Tier 1 (In-Memory Atomic Hold):** In Redis, a custom Lua script (`HOLD_SEATS_LUA`) atomically evaluates seat availability and issues locks in a single single-threaded step. If even 1 out of 8 requested seats is held or sold, the transaction aborts with `409 SEAT_TAKEN`.
2. **Tier 2 (Relational Final Guard):** Even under total Redis failure, the PostgreSQL unique constraint:
   ```sql
   CONSTRAINT bookings_showtime_seat_uniq UNIQUE (showtime_id, seat_id)
   ```
   physically forbids duplicate seat records from ever being committed to disk.
3. **Automated Refund Sweeper:** Any late webhooks arriving after hold expiration automatically trigger reverse ledger credits and full Paystack refunds.

---

## 3. Technology Stack

- **Mobile Client:** React Native (Expo SDK 52, Expo Router v4), TanStack Query v5, Zustand, React Native Reanimated v3, FlashList, `expo-image`, `expo-haptics`.
- **Backend API:** Node.js v24, Hono v4, PostgreSQL 17, Redis 8, BullMQ.
- **Payment Gateway:** Paystack NGN test checkout with HMAC-SHA512 verified webhooks.
- **Film Data BFF:** TMDB API BFF with single-flight mutex caching and stale snapshot fallback.
- **Testing & Verification:** Vitest (63 test cases) and Grafana k6 (500 VUs hold race).

---

## 4. App Store Billing Note

> [!NOTE]
> **Why Paystack and not Apple/Google In-App Purchase?**
> Under **Apple App Store Review Guideline 3.1.3(e) (Goods and Services Outside the App)** and **Google Play Billing Policy (Physical Services)**, transactions for real-world physical events—including cinema admissions, airline tickets, and concert passes—are strictly prohibited from using Apple/Google In-App Purchase and must instead use external payment providers (e.g. Paystack, Stripe).

---

## 5. Environment Variables & Security Isolation

Strict credential isolation is enforced. Paystack secret keys and TMDB tokens **never touch the mobile app bundle**.

### Allowed Mobile Client Variables (`EXPO_PUBLIC_`):
| Variable | Purpose | Security Justification |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Public endpoint for Matinee backend BFF | Public routing identifier; holds no secrets. |
| `EXPO_PUBLIC_SENTRY_DSN_APP` | Client-side error telemetry reporting | Ingest-only reporting key; cannot read data. |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Expo Application Services project identifier | Build configuration metadata; holds no credentials. |

---

## 6. Getting Started & Local Development

### Prerequisites
- Node.js $\ge$ 20.x
- Docker & Docker Compose (or local Postgres 17 & Redis 8)
- Grafana k6 (for load testing)

### Setup & Commands
```bash
# 1. Start database and cache services
docker compose up -d

# 2. Run migrations and seed cinemas, screens, and showtimes
npm run db:migrate
npm run db:seed

# 3. Start backend API server
npm run dev:server

# 4. Start Expo mobile client
npm run dev:app

# 5. Run automated test suites (must pass 3 consecutive runs)
npm run test

# 6. Execute 500 VUs k6 seat hold load test
npm run loadtest
```
