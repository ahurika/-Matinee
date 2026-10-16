# Matinee Design Spec (UX and UI)

| Field | Value |
|---|---|
| Design system | Original, built from tokens in `app/src/ui/tokens.ts`. Role names follow Material 3 so the logic is familiar, but the look is Matinee's own |
| Brand seed | `#E8590C` (warm orange), neutral warm-black surfaces |
| Default theme | Dark (cinema). Light is fully designed too |
| Typeface | Manrope (one family, four weights) |
| Platform | Android phones 360 to 412 dp, tablets supported |

**Why not a UI kit:** the brief grades the component library and the tokens. Using a ready-made kit would hide the work being judged. We build every component from tokens and reuse what we learned from Rota (roles, states, accessibility).

---

## 1. Design principles

1. **The poster is the hero.** Film art carries the screen. The interface stays quiet and gets out of the way.
2. **One clear next step.** Every screen has one obvious action: Book tickets, Continue, Pay, Show ticket.
3. **Seats are the product.** The seat map gets the most care: clarity, speed, and feedback.
4. **Time is visible.** Holds have a countdown. Waits show position. Nothing waits silently.
5. **Calm under pressure.** In a surge, the app says what is happening and what to do. No dead ends.
6. **Restraint.** One accent color, flat surfaces, tone for depth, motion only when it explains something.
7. **Accessible by default.** Contrast, labels, text scaling, big targets, and meaning that never depends on color alone.

## 2. Visual language

### 2.1 Hard rules

- **No gradients.** Text over posters uses a solid scrim (a flat black layer at 55 percent opacity), never a gradient.
- **Shadows only on floating layers:** bottom sheet, toast, and the sticky booking bar. Cards, lists, and buttons use tone and 1 dp borders. The tokens define three shadow levels because the brief requires them, and the theme lowers them in dark mode.
- No glassmorphism, blur, neon, decorative blobs, emoji as icons, or stock illustration.
- One icon family: Material Symbols through `@expo/vector-icons`. Outlined when idle, filled when selected.
- One accent color per screen. Accent marks the primary action and the selected state only.
- Real content in every design: real film titles, real cinema names, real naira prices. No lorem ipsum.

### 2.2 Does this look generated? (reject the screen if yes)

- Purple to blue gradient hero or glowing card?
- Floating cards with big soft shadows everywhere?
- Everything centered and rounded to the maximum?
- Vague copy such as "Unlock the magic of cinema!"?
- More than one accent color?
- Spacing off the 4 dp grid, or three different corner radii on one card?
- Poster with a decorative frame or fake 3D tilt?

### 2.3 Color (generated, verified)

Generated from the seed with Google's `@material/material-color-utilities` tone mapping: a vivid accent palette plus low chroma neutral surfaces. Success, warning, and info are custom roles harmonized toward the seed. Do not edit hex by hand. Source: `app/src/ui/tokens.ts`.

| Role | Dark | Light | Use |
|---|---|---|---|
| surface (background) | `#181210` | `#FFF8F6` | Screen background |
| surfaceContainerLow | `#201A18` | `#FEF1ED` | Cards |
| surfaceContainer | `#251E1C` | `#F8EBE7` | Tab bar, sheets |
| surfaceContainerHigh | `#2F2826` | `#F2E5E1` | Inputs, seats (available), chips |
| surfaceContainerHighest | `#3A3331` | `#EDE0DC` | Pressed states |
| onSurface | `#EDE0DC` | `#201A18` | Main text |
| onSurfaceVariant | `#D8C2BA` | `#53433E` | Secondary text, icons |
| outline | `#A08D86` | `#85736D` | Field and seat borders (not text) |
| outlineVariant | `#53433E` | `#D8C2BA` | Dividers |
| primary | `#FFB598` | `#A63B00` | Primary button, selected seat, links |
| onPrimary | `#591C00` | `#FFFFFF` | Text on primary |
| primaryContainer | `#7F2B00` | `#FFDBCE` | Tonal emphasis |
| secondaryContainer | `#5D4035` | `#FFDBCE` | Secondary button, premium seats |
| error / errorContainer | `#FFB4AB` / `#93000A` | `#BA1A1A` / `#FFDAD6` | Errors, destructive actions |
| success / successContainer | `#A7D567` / `#314F00` | `#426900` / `#C2F280` | Payment confirmed |
| warning / warningContainer | `#FFB787` / `#723600` | `#964900` / `#FFDCC7` | Held seats, timers |
| info / infoContainer | `#B9C3FF` / `#243CA1` | `#3F56BA` / `#DDE1FF` | Wheelchair seats, notes |

**Contrast, computed from the values above (WCAG ratio):**

| Pair | Dark | Light |
|---|---|---|
| onPrimary on primary | 7.74 | 6.47 |
| onSurface on surface | 14.39 | 16.37 |
| onSurface on surfaceContainerHigh | 11.22 | 13.97 |
| onSurfaceVariant on surface | 10.90 | 8.93 |
| onSurfaceVariant on surfaceContainerHighest | 7.27 | 7.27 |
| primary on surface | 10.87 | 6.16 |
| onErrorContainer on errorContainer | 7.24 | 13.26 |
| onWarningContainer on warningContainer | 7.27 | 13.33 |
| onInfoContainer on infoContainer | 7.28 | 13.31 |
| outline on surface (borders, needs 3:1) | 5.87 | 4.28 |

Every text pair clears 4.5 to 1. Use `outline` for borders and icons, never for text.

**Poster text:** text on posters or backdrops always sits on a solid scrim at 55 percent black or on a surface block. Check contrast on the real image, not the mock.

### 2.4 Typography

| Variant | Weight | Size / line | Use |
|---|---|---|---|
| display | Bold | 32 / 40 | Home hero title |
| title1 | Bold | 24 / 32 | Screen titles |
| title2 | SemiBold | 20 / 28 | Section titles |
| title3 | SemiBold | 17 / 24 | Card titles, cinema names |
| body | Regular | 16 / 24 | Synopsis, descriptions |
| bodySmall | Regular | 14 / 20 | Secondary text |
| label | SemiBold | 15 / 20 | Buttons |
| caption | Medium | 12 / 16 | Tab labels, metadata |
| overline | SemiBold | 11 / 16, uppercase | Small section labels |

Text scales with the system font size (capped at 2x in `Text`). Layouts must wrap or scroll at 200 percent.

### 2.5 Spacing, radius, shadow, motion

- **Spacing:** 4 dp grid. Tokens: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Screen side padding 16 dp.
- **Radius:** 4 (seat bottoms), 8 (seat tops, chips), 12 (cards, posters, inputs), 16 (large cards, QR), 24 (sheet top), pill (buttons, chips).
- **Shadow:** `none` (default), `sm`, `md` (toast), `lg` (bottom sheet). Floating layers only.
- **Motion:** 120 ms (press feedback), 200 ms (state change), 320 ms (screen and sheet), 700 ms (booking confirmation). Standard easing. Springs for seat taps. All animation respects "reduce motion".
- **Haptics:** light impact on button press, selection tick when a seat is toggled, warning when the seat limit is hit, success notification when payment is confirmed.

---

## 3. Navigation (the menu bar)

### 3.1 Tab bar

Four destinations. Custom component built from tokens (Matinee's own look, not the Material pill).

| # | Label | Icon (idle / selected) | Screen | Badge |
|---|---|---|---|---|
| 1 | Discover | `movie-open-outline` / `movie-open` | Home: hero, Now showing, Coming soon | none |
| 2 | Search | `magnify` / `magnify` (heavier weight) | Search and results | none |
| 3 | Tickets | `ticket-confirmation-outline` / `ticket-confirmation` | My tickets | Dot when a ticket was just issued |
| 4 | Account | `account-outline` / `account` | Profile, theme, about and credits, log out | none |

| Property | Value |
|---|---|
| Height | 64 dp plus system inset |
| Background | `surfaceContainer`, 1 dp top border `outlineVariant`, no shadow |
| Icon | 24 dp. Idle `onSurfaceVariant`. Selected `primary`, filled |
| Label | `caption`. Idle `onSurfaceVariant`. Selected `primary`, SemiBold |
| Touch target | Full width of the destination, at least 44 dp high |
| Behavior | Each tab keeps its own stack. Re-tap scrolls to top. Android back on a tab root goes to Discover, then exits |
| Visibility | Shown on the four root screens only. Hidden on movie detail, showtimes, seat map, waiting room, checkout, and ticket detail |

### 3.2 Headers

Screens use a transparent or `surface` header (no shadow) with a back button and a title.

| Screen | Header |
|---|---|
| Discover | No header. Hero image goes edge to edge under the status bar with a solid scrim |
| Search | Search field in the header |
| Movie detail | Back button over the backdrop (on a solid circle for contrast), share is out of scope |
| Showtimes | Title "{Movie title}", back |
| Seat map | Title "{Cinema}, Screen {n}", subtitle with time, back, countdown pill at the end once a hold exists |
| Checkout | Title "Checkout", back |
| Ticket | Title "Your ticket", close |

### 3.3 Booking flow

```
Discover / Search -> Movie detail -> Showtimes (date strip, cinemas, time chips)
 -> [Waiting room, only in a surge] -> Seat map (hold, countdown, summary bar)
 -> Checkout (price breakdown) -> Provider checkout (browser) -> Confirming -> Confirmation -> Ticket
```

Tickets tab: Upcoming and Past, then Ticket detail with the QR code.

---

## 4. Screens

### 4.1 Discover

- Hero carousel (3 to 5 films): backdrop, title (`display`), one-line meta (genre, runtime), "Book tickets" button and a page indicator. Solid scrim behind text.
- "Now showing": two-column poster grid (FlashList). Each card: poster 2:3, title, rating chip.
- "Coming soon": horizontal row of posters with release dates.
- Skeletons for hero, grid, and row. Empty state if the list is empty. Quiet "Showing saved details" note when the server says `stale`.

### 4.2 Movie detail

Backdrop with scrim, poster, title, year, runtime, rating, genre chips, synopsis (expandable), cast row. Sticky bottom bar with "Book tickets". If no showtimes: "No showtimes yet. Check back soon."

### 4.3 Showtimes

Date strip (7 days). Cinema sections with a name, area, and time chips. Chip states: available, filling fast (accent outline), sold out (disabled with "Sold out" label), opens later (shows "Opens 10:00"), cancelled (struck through with label). Format and price tier shown as small chips.

### 4.4 Waiting room (only in a surge)

Full screen. Poster (small), title "You are in line", large position number, rough wait ("About 40 seconds"), a calm progress bar, and "We will let you in automatically. Keep this screen open." Buttons: "Leave line". When admitted, a short check animation and an automatic push to the seat map. Position updates every 2 seconds. No spinners without text.

### 4.5 Seat map

- Screen indicator at the top (a flat curved line labeled "Screen").
- Seat grid, zoomable, centered. Legend row (Available, Selected, Held, Sold, Accessible) using the same icons as the seats.
- Sticky summary bar at the bottom (the only shadowed layer): selected seats ("F7, F8"), total price, countdown pill, and "Continue" button. Disabled with the hint "Pick at least 1 seat" until a seat is selected.
- Tapping a seat: spring pop, selection haptic, optimistic highlight, then the hold request. If the hold fails, the seat reverts with a short toast: "Someone just took F7. Pick another seat."
- Availability polls every 3 seconds. Seats taken by others turn to `held` or `sold` with a short fade.
- Seat limit: 8. The 9th tap gives a warning haptic and a toast.
- Countdown pill: "9:41". Under 2 minutes it changes to the warning container color and the text "Seats held for 1:52". At zero a dialog: "Your seats were released".

### 4.6 Checkout

Summary card (movie, cinema, time, seats), price breakdown (tickets, service fee, total in naira from kobo), countdown reminder, "Pay with Paystack" button. Secondary text: "You will not be charged until you confirm payment on the next page." Cancel opens a confirmation dialog: "Release your seats?".

### 4.7 Confirming, confirmation, and ticket

- **Confirming:** "Confirming your payment" with an indeterminate progress bar. Polls the order every 2 seconds, with a 60 second limit, then "Still waiting. Your seats are safe. We will notify you."
- **Confirmation:** animated check (Reanimated, 700 ms), haptic success, title "You are booked", summary, "View ticket".
- **Ticket:** QR on a white tile (the one deliberate non-token color pair, for scan reliability), movie, cinema, screen, time, seats, order number. "Brightness up" hint. Works offline from cache.

### 4.8 Tickets, Account

- **Tickets:** segmented control Upcoming and Past. Ticket cards with poster thumbnail, time, seats. A cancelled showtime shows a `warningContainer` banner: "This showtime was cancelled. Refund of N12,500 is on its way."
- **Account:** profile, theme (System, Light, Dark), "About and credits" (TMDB notice and logo), "Log out" (with a confirmation dialog).

---

## 5. Seat map specification

### 5.1 States (never by color alone)

| State | Fill | Border | Icon | Notes |
|---|---|---|---|---|
| Available | surfaceContainerHigh | outline | none | Tappable |
| Premium | secondaryContainer | secondary | none | Back rows, higher price |
| Selected | primary | primary | check | Spring pop on change |
| Held (someone else) | warningContainer | warning | clock | Not tappable |
| Sold | surfaceContainerLowest | outlineVariant | close | Not tappable |
| Wheelchair (available) | infoContainer | info | wheelchair | Wider hit area |
| Wheelchair (selected) | primary | primary | wheelchair | |

Shape: rounded top (8) and flat bottom (4) so a seat reads as a seat. Size 28 dp, gap 4 dp.

### 5.2 Performance (300 or more seats)

- Seats are `React.memo` components. Tapping one seat re-renders only that seat.
- Gestures (pinch, pan, double tap) run on the UI thread with Reanimated and Gesture Handler.
- Positions are absolute (computed from row and column), so no layout pass per seat.
- Measure on a real mid-range Android phone. If frames drop, the next step is drawing seats with Skia and hit-testing by coordinates, at the cost of per-seat accessibility. Record the result in `COMPONENTS.md`.

### 5.3 Accessibility of the seat map

- Each seat has a label: "Row F, seat 7, available". State is exposed (`selected`, `disabled`).
- **44 point target rule vs 300 seats:** a 28 dp seat plus hit slop is about 40 dp at 100 percent zoom. Zoom in to reach 44 dp or more. The map starts fit-to-width, and double tap zooms to 140 percent.
- **List picker:** a "Choose seats by row" button opens a list: row selector, then a grid of large seat buttons for that row. It opens automatically when a screen reader is on. This is the accessible path for the seat map.
- Legend icons match seat icons. Selected seats are also summarized in text in the bottom bar.

---

## 6. Component library (12 required, more included)

Every component uses only tokens, has all states, and is shown in the gallery at `/gallery` (hidden route). `COMPONENTS.md` documents props, variants, and states for each.

| # | Component | Variants and states | Built? |
|---|---|---|---|
| 1 | Button | primary, secondary, outline, text, destructive. md, lg. loading, disabled, pressed | Yes (`Button.tsx`) |
| 2 | Text | 9 variants, any color role, align | Yes (`Text.tsx`) |
| 3 | Card | filled, outlined. pressable or static | Build |
| 4 | MovieCard | poster, title, rating. skeleton, pressed, "coming soon" | Build |
| 5 | Input | default, focused, error, disabled, with helper text, password with toggle | Build |
| 6 | Chip | filter (selected or not), info, status (available, filling fast, sold out, cancelled) | Build |
| 7 | Badge | dot, count. accent, error | Build |
| 8 | BottomSheet | 2 snap points, drag handle, dismiss, backdrop (shadow `lg`) | Build (Reanimated and Gesture Handler, no library) |
| 9 | Skeleton | block, text line, poster, card. reduce motion aware | Yes (`Skeleton.tsx`) |
| 10 | Toast | info, success, error. action, auto dismiss, swipe away (shadow `md`) | Build |
| 11 | EmptyState | icon, title, message, action | Build |
| 12 | SeatMap | all seat states, zoom, limit, memoized | Yes (`seatmap/`) |
| 13 | Poster | placeholder, fade in, cache, no image | Yes (`Poster.tsx`) |
| 14 | TicketQr | QR on white tile | Yes (`TicketQr.tsx`) |
| 15 | Dialog | confirm, destructive, result | Build (same pattern as Rota) |
| 16 | CountdownPill | normal, warning, expired | Build (uses `useHoldCountdown`) |
| 17 | DateStrip, ShowtimeChip, PriceSummary, TabBar, Header, SegmentedControl | | Build as screens need them |

Stretch: publish one component (for example `SeatMap`) as an npm package with its own README.

## 7. States every screen needs

- **Loading:** a skeleton that matches the layout. A spinner only inside buttons.
- **Empty:** icon, title, one sentence, one action.
- **Error:** icon, title, message from `errorMessages.ts`, "Try again".
- **Offline:** banner, cached tickets still open.
- **Degraded TMDB:** quiet "Showing saved details".
- **Surge:** waiting room screen, or "Matinee is busy right now" with Retry.
- **Light and dark:** both designed. Dark is the reference.

## 8. Accessibility checklist

- [ ] Text contrast 4.5 to 1 (verified for tokens, verify on poster text)
- [ ] Every button, icon button, image, and seat has an accessibility label
- [ ] Text scales to 200 percent without clipping
- [ ] Targets at least 44 by 44 dp (seat map handled by zoom and list picker)
- [ ] Screen reader order makes sense on every screen. Dialogs and sheets trap focus
- [ ] Color is never the only signal (seat states, chip states, countdown warning)
- [ ] Reduce motion respected (skeleton, confirmation, seat pop, transitions)
- [ ] Haptics are optional feedback, never the only feedback

---

## 9. Design first: 5 apps you admire (required in the docs)

Pick five and screenshot what you like. One line each on why it works. Suggested places to look (choose your own, and verify what you see in the current app):

| What to study | Look at | Question to answer |
|---|---|---|
| Poster-led browsing | A film discovery or logging app | How does it make dense poster grids feel calm? |
| Seat selection | Any cinema or event ticket app | How does it show states, zoom, and the total? |
| Checkout trust | A ticketing or travel app | How does it explain price, fees, and time left? |
| Dark UI done well | A streaming app | How does it use tone for depth without shadows? |
| Motion with purpose | Any app with a great success moment | What does the animation explain? |

| App | Focus Area | What Works | What Matinee Took From It |
|---|---|---|---|
| **Letterboxd** | Poster-led film browsing | High-density 2:3 vertical posters with minimal decorative clutter allow cover art to drive user engagement. | Matinee's Home and Search screens prioritize poster art with flat tonal cards and strict 2:3 aspect ratios. |
| **AMC Theatres** | Interactive seat map | Curved visual screen arc, clear color-coded tier pricing (standard vs. premium), and persistent bottom total bar. | Our 320-seat interactive canvas with curved silver screen header, clear seat states, and pinch/pan navigation. |
| **Trainline** | Trust & breakdown in checkout | Clear line-item transparency (base ticket + service fee) and explicit countdown timer before seat release. | The breakdown card in `checkout/[showtimeId].tsx` and the real-time drifting-compensated `CountdownPill`. |
| **Spotify** | Pure tonal dark mode | Eliminates artificial drop shadows on surfaces, relying strictly on tonal elevation steps for depth. | Our strict "no shadows on cards" rule, employing `surfaceContainerLow` and `surfaceContainerHigh` token steps. |
| **Linear** | Purposeful motion & haptics | Fast, tactile spring physics and haptic confirmations that reassure the user without delaying actions. | `ConfirmationCelebration` checkmark draw animation and haptic feedback on every seat tap and order milestone. |

## 10. Figma workflow (design every screen before building)

1. Create the file `Matinee`. Pages: Tokens, Components, Screens (Dark), Screens (Light), Prototype.
2. **Variables:** Color (modes Dark and Light, same role names as `tokens.ts`), Spacing, Radius, Shadow (effect styles). Text styles for the 9 variants.
3. Build components with variants and states (the list in section 6) using auto layout.
4. Design frames at 360 by 800 and 412 by 915, plus one tablet frame (600 or wider) for the seat map.
5. Design every screen in section 4 in every state in section 7.
6. Prototype: seat selection (smart animate), waiting room to seat map, checkout to confirmation, and ticket.
7. Name layers and components after the code (`Button`, `MovieCard`, `SeatMap`, `BottomSheet`).
8. **Change test (interview question 6):** change `primary` in Figma variables and in `tokens.ts`. Both files should update the whole app. Practice it.
9. Put the Figma link in the README, the demo video, and `SUBMISSION.md`.

## 11. Implementation map

| Design element | Code |
|---|---|
| Tokens | `app/src/ui/tokens.ts` |
| Theme and dark mode | `app/src/ui/theme.tsx` (`ThemeProvider`, `useTheme`) |
| Components | `app/src/ui/components/`, `app/src/ui/seatmap/` |
| Error copy | `app/src/ui/errorMessages.ts` |
| Hold countdown | `app/src/ui/useHoldCountdown.ts` |
| Fonts | `@expo-google-fonts/manrope`, loaded in `src/app/_layout.tsx` |
| Gallery route | `app/src/app/gallery.tsx` (hidden, linked from Account by a long press on the version number) |

## 12. UI definition of done

- [ ] Designed in Figma first, matches the build
- [ ] Only tokens and library components. No raw hex or off-grid spacing
- [ ] No gradients. Shadows only on floating layers
- [ ] All states designed (loading, empty, error, offline, surge)
- [ ] Dark and light checked on a real phone
- [ ] Accessibility checklist passed (section 8)
- [ ] `npx tsc --noEmit` and `npx expo lint` clean
- [ ] Checked against "does this look generated" (section 2.2)
