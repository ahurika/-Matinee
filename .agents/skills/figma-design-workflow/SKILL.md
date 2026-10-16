---
name: figma-design-workflow
description: Use when planning or reviewing the Matinee Figma file: design every screen first, define tokens as Figma variables matching tokens.ts, study 5 apps, build components with variants, prototype key flows, and prepare handoff. The human is a product designer, so guide the process and review, do not design for them.
---

# Figma-first workflow

The brief says: design every screen in Figma before building, define tokens, study 5 apps, and put it in the docs. The Figma link is a deliverable. You (the agent) guide and review. The human designs.

## Order of work

1. **Study 5 apps (45 minutes).** Pick five apps you admire (see `docs/DESIGN.md` section 9). Screenshot what you like. One line each: what works, what you will borrow. Put the table in `docs/DESIGN.md`.
2. **Tokens as variables (30 minutes).** Create a Figma file `Matinee` with pages Tokens, Components, Screens Dark, Screens Light, Prototype. Variables: Color collection with Dark and Light modes using the exact role names in `tokens.ts` (primary, onPrimary, surface, surfaceContainerHigh, outline, success, warning, info, and so on). Number variables for spacing and radius. Effect styles for shadows (none, sm, md, lg). Text styles for the 9 variants (Manrope).
3. **Components (2 hours).** Build with auto layout, variants, and states: Button, Chip, Badge, Input, Card, MovieCard, EmptyState, Dialog, Toast, BottomSheet, Skeleton, CountdownPill, SeatMap seat set (all 7 states), TabBar, Header.
4. **Screens (3 to 4 hours).** Every screen in `docs/DESIGN.md` section 4 in dark first, then light: Discover, Movie detail, Showtimes, Waiting room, Seat map, Checkout, Confirming, Confirmation, Ticket, Tickets, Account, Auth, plus empty, error, offline, surge, and cancelled-showtime states. Frames 360 by 800 and 412 by 915. One tablet frame for the seat map.
5. **Prototype (1 hour).** Flows: browse to ticket, seat selection with smart animate, waiting room to seat map, cancelled showtime refund notice.
6. **Handoff:** name layers and components exactly like the code. Add notes for motion durations, haptics, and accessibility labels. Export the Figma link.

## Review checklist (the agent runs this when the human shares screens)

- Only variables and styles, no loose hex or one-off spacing.
- Contrast: check text over posters on real images.
- 44 dp targets on buttons, chips, tabs. The seat map has a documented exception.
- Every list has skeleton, empty, error states drawn.
- Dark and light both drawn.
- No gradients. Shadows only on sheet, toast, sticky bar.
- Real content (film titles, cinema names, naira prices).
- Screens match components (no detached instances).
- Flow covers the unhappy paths: seat taken, hold expired, payment failed, late payment refunded, TMDB down, surge.

## Practice the interview demo

"Show me where your design tokens are defined and change one color in front of me." Change `primary` in the Figma variables, show screens update. Then change `primary` in `tokens.ts` (and note you regenerate the scheme for a full accessible set) and show the app update.

## Using the Figma connector (optional)

If the Figma connector is enabled in this chat, you can read the file to compare it with `tokens.ts` and the component list, and report differences. Do not generate designs for the human unless they ask.

## Explain-back questions for the human

1. Why design every screen before building?
2. How do Figma variables map to `tokens.ts`?
3. Which three screens took the most iterations, and what changed?
