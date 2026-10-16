# Matinee 3-Minute Demonstration Video Script

## Target Duration: 3 Minutes (180 Seconds)
**Presenter:** Kate Ahurika  
**Project:** Matinee (Dev and Design HQ Final Project, Part 2, Task B)

---

### [0:00 - 0:35] Scene 1: The Problem & System Overview
- **Visual:** Split screen showing the Matinee mobile app on an Android phone alongside a live terminal running Grafana k6.
- **Voiceover:**
  > *"When a major blockbuster like Dune: Part Two drops in Lagos, thousands of moviegoers compete for the exact same seats at the exact same minute. How do you ensure no seat is ever double-sold, payment webhooks settle securely into an append-only ledger, and the mobile app stays buttery-smooth even under surge?*
  > *This is Matinee—a full-stack cinema ticket booking app built with Expo React Native, a Hono BFF, Redis Lua atomic reservation scripts, and an immutable PostgreSQL financial ledger."*

---

### [0:35 - 1:15] Scene 2: The Mobile App & Custom Design System
- **Visual:** Walkthrough of Home screen, 2:3 vertical poster cards, search with debouncing, movie detail page with solid black scrim, and showtime selection with 7-day date chips.
- **Voiceover:**
  > *"Notice the design system: built strictly from design tokens with zero raw hex codes, zero gradients, and flat tonal surfaces instead of heavy drop shadows. The film art is the hero.*
  > *Every screen handles loading skeletons, offline states, and error recovery. When selecting a showtime, the interactive seat map loads 320 seats with smooth pinch-to-zoom and pan gestures."*

---

### [1:15 - 1:55] Scene 3: Seat Selection, Accessibility & Checkout
- **Visual:** Tap seats (instant haptic feedback and micro-spring scale pop). Demonstrate the Accessible Seat List Picker for TalkBack screen readers with 52 dp touch targets. Proceed to Checkout.
- **Voiceover:**
  > *"Tapping seats triggers tactile haptics and starts a drift-compensated 10-minute hold countdown. For screen reader users who cannot navigate a 2D spatial canvas, Matinee automatically presents a list-based seat picker with 52 dp touch targets.*
  > *On checkout, prices and service fees are calculated strictly on the backend in integer kobo. We complete test payment through Paystack."*

---

### [1:55 - 2:30] Scene 4: Confirmation, QR Ticket & The Append-Only Ledger
- **Visual:** Paystack test payment success $\rightarrow$ Confirmation Celebration (SVG checkmark draws via stroke-dashoffset animation, spring physics circle) $\rightarrow$ Signed QR ticket pass with turnstile scanner verification.
- **Voiceover:**
  > *"Once Paystack sends an HMAC-SHA512 signed webhook, our background worker idempotently fulfills the booking, credits the append-only ledger, and issues an HMAC-signed QR ticket.*
  > *Notice this celebration animation: checkmark drawing along its SVG path with spring physics and an instant fallback if the user enabled reduce-motion in their OS settings."*

---

### [2:30 - 3:00] Scene 5: High-Concurrency Load Test (500 VUs Race)
- **Visual:** Terminal executing `k6 run load-tests/hold-race.js` with 500 VUs colliding on 50 seats. Cut to terminal running SQL verification query showing 0 duplicates and exactly 50 bookings.
- **Voiceover:**
  > *"Here is the ultimate proof. We ran a load test where 500 virtual users race for the same 50 seats—10 competitors per seat. Look at the metrics: 100% checks passed, 0% network errors, exactly 50 holds won, and 450 cleanly rejected with 409 SEAT_TAKEN.*
  > *And our database query proves: 0 duplicate seats committed. Matinee proves that world-class design craft and rock-solid backend system design can exist together."*
