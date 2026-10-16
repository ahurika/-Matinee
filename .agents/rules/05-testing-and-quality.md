# Rule 05: Testing and quality

**Activation:** Always On.

## Principle

"It works" is not success. Success is the correct record in the database, the correct response, and saved evidence. A claim without evidence is not done.

## Rules for the agent

1. Write the test first or with the code. A feature without a test is unfinished.
2. Run the tests and paste the real command and output. If a test fails, say so and fix the code. Never weaken or delete a test to make it pass.
3. Never invent numbers (latency, throughput, coverage, load test results). If you could not run something, say that plainly.
4. Concurrency tests use real Postgres and real Redis (docker compose). Do not mock them for proof tests.
5. Race tests must be deterministic. Assign each virtual user a seat with `u % 50`. Random picks leave some seats untouched and make assertions flaky (this happened while building the kit).
6. Each test creates its own data and passes in any order.
7. After a bug fix, add a test that fails without the fix.

## Proof tests (PRD section 15)

T1 to T8 exist as reference code in `server/test/` and pass. Add T9 to T18 as you build. Keep `docs/test-results/README.md` as a table: id, file, date, result, link to saved output.

## Load test

`load-tests/` holds the k6 script, the winner-completion script, `REPORT.md`, and the proof SQL output. Run it locally or on staging and say which. See skill `load-testing-500-vus`.

## Code quality

TypeScript strict. Lint and typecheck before every commit. Comments explain why (especially around Lua, locks, and transactions), because the human must explain every line in an interview. No dead code. No `console.log` in committed code.

## Evidence folders

`docs/test-results/`, `docs/performance/`, `load-tests/`.
