---
name: docs-and-adr-writer
description: Use when writing or updating Matinee documentation: README top section, ARCHITECTURE.md, TRAFFIC.md, SHARDING.md, COMPONENTS.md, ADRs, the app store billing note, TMDB attribution, and LEARNING-LOG templates. Keeps docs accurate and in the builder's own voice.
---

# Documentation and ADR writer

Docs are graded and they are your interview notes. Write them as you build, in the human's voice: short, plain, active, no filler. Do not invent facts. If something was not built or measured, say so. Propose drafts, let the human rewrite.

## README (first screen matters)

```
# Matinee
One line: Cinema ticket booking that never sells a seat twice, built with React Native, Hono, Redis, and PostgreSQL.

![demo](docs/demo.gif)
**Android build:** <link>  **Demo video (3 min):** <link>  **Figma:** <link>  **API:** <link>
```

Then: the problem (a blockbuster opens and thousands tap the same seats), what it does, stack, key results (race test and load test numbers, linked), run locally (commands that were actually run), architecture summary with diagram, three hardest decisions with ADR links, the `EXPO_PUBLIC_` list, the app store billing note, TMDB attribution, what I would do next.

### `EXPO_PUBLIC_` table (required)

| Variable | Why it is safe |
|---|---|
| EXPO_PUBLIC_API_URL | Public address of our API |
| EXPO_PUBLIC_SENTRY_DSN_APP | A DSN can only send events |
| EXPO_PUBLIC_EAS_PROJECT_ID | An identifier, not a credential |

### App store billing note (required)

Cinema tickets are a real-world service used outside the app, so other payment processors are generally allowed, unlike digital subscriptions. Read the current Apple App Review Guidelines on payments (section 3.1) and the current Google Play payments policy, link both, and state your conclusion and uncertainty. Do not paste policy text from memory.

### TMDB attribution (required)

Use TMDB's current required notice and approved logo as recorded in `ADR-003`. State that production use of the TMDB API by a ticket seller would need a commercial agreement.

## ARCHITECTURE.md

Overview, Mermaid diagram, components, request lifecycle for a booking, data placement, pooling numbers and reasoning (`ADR-007`), read routing and the 5 second rule, caching table (cached with TTL and invalidation, never cached with reasons), jobs and retry policy, observability, pricing formula, late webhook policy, known limits.

## TRAFFIC.md (the traffic management design)

Sections: the problem at 10:00:00; atomic seat holds (Lua, why not two steps); database safety net; waiting room (capacity, admission rate, heartbeat, why these numbers); rate limits table; caching to protect TMDB and the database; real-time availability decision (polling vs SSE vs WebSockets with costs); overload shedding and graceful failure in the app; Redis down behavior; late webhook; load test summary and link to `load-tests/REPORT.md`; what you would change at 10 times the traffic.

## SHARDING.md

Use the five sections in skill `sharding-pooling-replication-plan`.

## COMPONENTS.md

Per component: purpose, props table, variants, states, tokens used, accessibility, usage, gallery screenshot. Add measured seat map performance and the accessibility checklist results.

## ADRs (`docs/decisions/ADR-NNN-title.md`)

Template: Problem, Options considered (pros and cons), Decision, Why, Consequences. Starter list: ADR-001 monorepo, ADR-002 Hono, ADR-003 TMDB terms and attribution, ADR-004 custom component library over a UI kit, ADR-005 payment provider and webhook signing, ADR-006 polling for availability, ADR-007 pool sizes, ADR-008 cache TTLs, ADR-009 waiting room parameters, ADR-010 degraded mode when Redis is down, ADR-011 late webhook policy, ADR-012 shard key.

## LEARNING-LOG.md (the human writes it)

```
## 2026-10-DD: <task>
What I built (2 or 3 sentences):
Why it works (the core idea):
How it could break:
One thing I got wrong or learned:
Interview question I can now answer:
```

The agent gives the template and 3 questions only.

## LinkedIn post (the human writes it)

Topic for Task B: the double-booking problem. Structure: the bug in plain words (two people, one seat, two steps), the fix (one atomic Redis step, plus a database constraint as a safety net), the proof (500 users, 50 seats, zero double bookings, link to the report), one thing you did not expect. One screenshot or short clip of the seat map. No "excited to announce".

## Review checklist before saying docs are done

- [ ] Every claim links to code, a test, or saved output
- [ ] No invented numbers
- [ ] Run commands were actually run
- [ ] No em dashes or filler, short sentences, active voice
- [ ] No secrets in screenshots or logs
