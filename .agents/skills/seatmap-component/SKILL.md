---
name: seatmap-component
description: Use when building or changing the Matinee SeatMap component or seat selection screen: 300+ seats at 60 fps, seat states (available, selected, held, sold, wheelchair, premium), pinch zoom and pan, selection limit, haptics, accessibility labels, and the list-based seat picker for screen readers. Reference code is in app/src/ui/seatmap.
---

# SeatMap component

## What exists (verified: type-checks, lints, bundles; not yet run on a real phone)

| File | Role |
|---|---|
| `seatmap/types.ts` | `Seat` (id, row, number, col, kind, status) and visual states |
| `seatmap/layout.ts` | `buildHall()` makes a 20 by 16 hall (320 seats) with an aisle, premium back rows, wheelchair seats. For the gallery and tests |
| `seatmap/seatStyles.ts` | `visualFor`, `paletteFor`, `LABELS`: fill, border, icon for each state, from theme roles |
| `seatmap/SeatMap.tsx` | The component. Memoized seats, pinch and pan and double tap zoom, selection limit with haptics, accessibility labels |
| `useHoldCountdown.ts` | Countdown from the server expiry time |

## Seat states (never by color alone)

Available (neutral, outlined), premium (secondary tone), selected (primary fill and check), held by someone else (warning tone and clock icon), sold (dark, X icon), wheelchair (info tone and wheelchair icon), wheelchair selected. See the table in `docs/DESIGN.md` section 5.1.

## Data shape from the server

`GET /v1/showtimes/:id/seatmap` returns the static layout (cache 1 hour): `{ seats: [{ id, row, number, col, kind }] }`. `GET /availability` returns `{ held: string[], sold: string[], version }`. The app merges them into `Seat[]` with `status`. Seats held by the current user are shown as selected, not as `held`.

## Performance rules (300 or more seats)

1. One memoized component per seat. A tap re-renders only that seat. Never pass new inline functions or objects to `SeatButton` (the shared `handlePress` is stable and takes the seat).
2. Positions are absolute from row and column. No flex layout pass for 300 views.
3. Gestures and transforms run on the UI thread (Reanimated shared values and worklets). Do not set React state on every pan frame.
4. Merge availability updates by id and only create new `Seat` objects for seats whose status changed, so memo keeps working.
5. Measure on a real mid-range Android phone with the dev build (Perf Monitor). Record real numbers in `COMPONENTS.md`. If frames drop, the next step is drawing the seats on a Skia canvas and hit-testing by coordinates. That costs per-seat screen reader labels, so keep the list picker as the accessible path.

## Interaction

- Tap: toggle selection, selection haptic, spring pop on the seat. Over the limit (8): warning haptic, `onLimitReached` shows a toast.
- Pinch to zoom (fit-to-width up to 2.5x). Pan is clamped so the hall cannot be dragged off screen. Double tap toggles fit and 1.4x. Honor reduce motion (no spring when on).
- Selection is optimistic in local state. The parent sends the hold request and reverts seats listed in a 409 response.
- Parent owns the sticky summary bar (seats, price, countdown, Continue).

## Accessibility

- Each seat: `accessibilityRole="button"`, label "Row F, seat 7, available", state `selected` and `disabled`.
- Hit slop adds about 12 dp, so at 100 percent zoom the target is about 40 dp, and 44 dp or more after zooming in. Document this trade-off in `COMPONENTS.md`.
- **List picker (required for the accessible path):** a "Choose seats by row" button opens a BottomSheet or screen with a row selector and, for the chosen row, large (48 dp) seat buttons with the same states. It opens by default when `AccessibilityInfo.isScreenReaderEnabled()` is true. Both views share the same selection state.
- The legend (with icons identical to the seats) and a text summary of selected seats are always on screen.

## Gallery states to show

Empty hall, mixed (sold, held, wheelchair, premium), several selected, limit reached, zoomed in, dark and light, large text, reduce motion.

## Tests

- Unit: `visualFor` for every status and kind combination. `buildHall()` returns 320 seats with unique ids.
- Component: tapping a sold or held seat does nothing, tapping the 9th seat calls `onLimitReached`.
- Manual on device: select 8 seats quickly, pinch and pan during a poll update, TalkBack through a row, large text.

## Explain-back questions for the human

1. Why are seats memoized, and what would happen at 320 seats without it?
2. How do you meet the 44 point target with 300 seats on a small screen?
3. What happens in the app if the server answers 409 for a seat the user just tapped?
