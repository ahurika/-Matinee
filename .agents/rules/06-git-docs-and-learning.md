# Rule 06: Git, documentation, and learning

**Activation:** Always On.

## Git

Feature branches (`feat/`, `fix/`, `docs/`, `chore/`). Conventional Commits (`feat: add atomic seat hold script`). Small pull requests with what, why, test output, and screenshots. The human merges. No force pushes to `main`. No secrets in commits. No fake or empty commits. Use Issues as the task list.

## Documents

| File | Contents |
|---|---|
| README.md | First screen: one line, GIF, download link, demo link, Figma link. Then problem, stack, run locally, architecture, decisions, proof, `EXPO_PUBLIC_` list, app store billing note, TMDB attribution, next steps |
| docs/ARCHITECTURE.md | Diagram, components, data flow, pooling numbers, read routing, caching table (cached and never cached), jobs, observability |
| docs/TRAFFIC.md | Hold design, waiting room, rate limits, polling decision, overload and degraded behavior, parameters with reasons |
| docs/SHARDING.md | Tables to shard, shard key, hot showtime risk, mitigation, harder queries |
| docs/COMPONENTS.md | Every component: props, variants, states, usage, accessibility |
| docs/DESIGN.md | Spec plus the 5 apps you studied |
| docs/decisions/ADR-NNN-*.md | One decision each |
| LEARNING-LOG.md | Human-written explain-back paragraphs |

Write docs as you build.

## App store billing note (README)

Cinema tickets are a real-world service used outside the app, which generally can use other payment processors. Apple and Google still have rules for in-app purchases. Read the current Apple App Review Guidelines on payments (section 3.1) and the current Google Play payments policy, link them, state your conclusion and any uncertainty. Do not write policy text from memory.

## TMDB attribution (README and Credits screen)

Use the notice and logo exactly as TMDB's current terms and FAQ require. Record the wording and rules in `ADR-003`.

## Explain-back rule

After each task: give a plain summary (5 sentences or fewer), point to the 2 or 3 lines that matter, name one way it could break, then ask the human 3 questions to answer in `LEARNING-LOG.md` in their own words. Never write the log entry for them.

## LinkedIn post support

Suggest specific decisions as post topics (for example: "why one Lua script instead of 50 SET NX calls", "why the unique constraint stays even though Redis already prevents it", "why the waiting room only appears when the room is full"). The human writes the post.
