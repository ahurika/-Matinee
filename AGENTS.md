# AGENTS.md: Matinee

Matinee is a cinema ticket booking app. Users browse films (data from TMDB through our backend), pick a showtime, choose seats on a seat map, pay in test mode, and get a QR ticket. The hard part: when a popular film opens, thousands of people go for the same seats in the same minute. No seat may sell twice and the system must stay up.

This is a graduation project (Dev and Design HQ final task, Part 2, Task B). Deadline: Monday, 19 October 2026. The interface is judged harshly, so craft matters as much as correctness.

**Read `PRD.md` and `docs/DESIGN.md` before every task.** If this file and `PRD.md` disagree, `PRD.md` wins.

## Who you are working with

A product designer and design engineer learning backend system design through this project. They must explain every line in an interview.

1. Work in small steps. Say what you will do before you do it.
2. After each task: plain-English summary (5 sentences or fewer), the 2 or 3 lines that matter, one way it could break, and 3 explain-back questions for `LEARNING-LOG.md`. Never write their log entries.
3. Never say a test passes unless you ran it and saw it pass. Paste real output. Never invent numbers, query plans, or load test results.
4. Before using an Expo, Reanimated, Paystack, or TMDB API you are not sure about, read the current official docs. These change fast.
5. Reference code in `server/src/seats`, `server/src/traffic`, `server/src/integrations/tmdb`, `server/src/config/pricing.ts`, and `app/src/ui` is tested. Copy and adapt it. Do not rewrite it from memory.

## Repo map

```
matinee/
  app/            Expo app. See app/AGENTS.md
  server/         Hono API, workers, migrations. See server/AGENTS.md
  load-tests/     k6 scripts and REPORT.md
  docs/           ARCHITECTURE, TRAFFIC, SHARDING, COMPONENTS, DESIGN, decisions/, performance/, test-results/
  .agents/        Rules, skills, workflows for Antigravity
  PRD.md          Source of truth
  LEARNING-LOG.md Human-written explain-back paragraphs
```

## Stack (decided, see PRD section 12)

TypeScript. App: Expo, Expo Router, TanStack Query, Zustand, FlashList, expo-image, Reanimated, Gesture Handler, expo-haptics, expo-secure-store. Own component library from tokens. Server: Node, Hono, Zod, Prisma plus raw SQL, PostgreSQL, Redis, BullMQ, Paystack test mode. Tests: Vitest. Load tests: k6.

## Non-negotiable rules (full text in `.agents/rules/`)

1. **Never trust the frontend.** Prices, fees, availability, and payment success are decided on the server.
2. **A seat hold is one atomic Redis step** (Lua), all or nothing. Never "check then set".
3. **The database unique constraint on `bookings (showtime_id, seat_id)` is the final guard.** Never remove it.
4. **Money is integer kobo.** Fee is computed on the server (`config/pricing.ts`).
5. **Booking is confirmed only by a verified webhook**, processed in a background job, idempotent, duplicates ignored.
6. **The app never calls TMDB.** Only `integrations/tmdb/tmdbClient.ts` knows TMDB's data shape.
7. **No secrets in the repo or the app.** Only three `EXPO_PUBLIC_` variables are allowed.
8. **Everything slow or unreliable is a background job** with exponential backoff and a failed list.
9. **UI uses tokens and library components only.** No gradients. Shadows only on floating layers.
10. **Every screen has loading, empty, error, offline, and surge states.**
11. **"It works" is not success.** Evidence: the correct record, a test, a saved output.
12. **Conventional Commits** and small pull requests.

## Commands (fill in during M0 and keep current)

```
npm run db:up          start Postgres and Redis (docker compose)
npm run dev:server     API and workers
npm run dev:app        Expo dev client
npm run db:migrate     migrations
npm run db:seed        cinemas, screens (320 seats), showtimes
npm run test           server tests (run seat and traffic tests 3 times after any change)
npm run lint           typecheck and lint both packages
npm run loadtest       k6 hold race (see load-tests/)
```

## Definition of done (every task)

Compiles and lints. Tests for the change exist and pass (output pasted). New endpoints validate with Zod and check ownership. No secrets added. Docs or ADR updated if behavior or a decision changed. Conventional commit message. UI changes follow `docs/DESIGN.md` and the gallery and COMPONENTS.md are updated. Human got the summary and explain-back questions.

## Where to find more

Rules: `.agents/rules/`. Skills: `.agents/skills/`. Workflows: `/plan-feature`, `/pre-pr-check`, `/explain-back`.

Skills: `seat-holds-and-booking-integrity`, `waiting-room-and-rate-limits`, `realtime-seat-availability`, `tmdb-bff-integration`, `checkout-webhooks-refunds-ledger`, `observability-and-resilience`, `sharding-pooling-replication-plan`, `load-testing-500-vus`, `design-tokens-and-component-library`, `seatmap-component`, `animation-haptics-and-motion`, `images-lists-and-states`, `accessibility-and-responsive-ui`, `figma-design-workflow`, `docs-and-adr-writer`, `auth-and-token-rotation`, `eas-build-and-deep-links`.

## Never do

Never commit `.env`, keys, or tokens. Never skip or weaken a failing test. Never add a dependency without saying why. Never call TMDB or Paystack secrets from the app. Never use `KEYS` or `SCAN` in a request path. Never fake commit history or test output.
