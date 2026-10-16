# LinkedIn Post: How We Solved the Cinema Double-Booking Problem Under 500-VU Surge

---

**Copy text for LinkedIn:**

What happens when 5,000 moviegoers try to book the exact same cinema seats in the exact same second? 🎟️💥

In ticketing system design, "check-then-set" is a death trap. If two requests read a seat as available at $t_0$, both write confirmations at $t_1$. Result: an angry customer standing in aisle 4 holding a duplicate ticket.

For my Dev and Design HQ graduation project (**Matinee**), I set out to prove that world-class design craft and rock-solid backend system design belong together.

Here is how we solved high-concurrency seat reservation integrity:

1. **Never Trust the Frontend:** Prices, service fees, and seat availability are computed strictly on the backend in integer kobo. The mobile app never touches provider secrets.
2. **Atomic Lua Holds in Redis:** Instead of suffocating the database with row locks (`SELECT FOR UPDATE`), holds execute as a single atomic Lua script on Redis. If even 1 out of 8 seats is taken, the transaction aborts in $< 2\text{ ms}$ with `409 SEAT_TAKEN`.
3. **The Relational Safety Net:** In PostgreSQL, `UNIQUE (showtime_id, seat_id)` is the final guard. Even under catastrophic cache failure, duplicate bookings cannot physically be written to disk.
4. **Append-Only Immutable Ledger:** Payments arrive via HMAC-SHA512 signed Paystack webhooks processed idempotently in BullMQ. Financial entries are written to an append-only ledger protected by database triggers that strictly forbid `UPDATE` and `DELETE`.
5. **Design That Respects Everyone:** Built with an original token-based design system, flat tonal elevations, WCAG AAA screen reader support via an accessible seat list picker with 52 dp touch targets, and motion that honors system reduce-motion settings.

🔥 **The Test:**
We simulated 500 virtual users with Grafana k6 racing for the same 50 seats (10 users colliding on every single seat).
- 550 total requests across holds and bookings
- **100.00% check success rate**
- **0.00% HTTP failure rate**
- **Exactly 50 holds won, 450 lost, 50 bookings created**
- Post-run SQL proof query: **0 duplicate seats committed to disk**.

Huge thanks to Dev and Design HQ facilitators and the community for pushing me to understand every line of SQL, Lua, and React Native Reanimated under the hood!

Check out the full open-source repo, architecture diagrams, and benchmark report below 👇

#SystemDesign #SoftwareEngineering #ReactNative #PostgreSQL #Redis #HighConcurrency #Fintech #WebDevelopment #DevAndDesignHQ
