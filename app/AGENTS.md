# AGENTS.md: app

Applies under `app/`. Root `AGENTS.md`, `PRD.md`, and `docs/DESIGN.md` still apply.

Expo SDK 57 at scaffold time. Expo changes breaking things every SDK. Before using an Expo, Reanimated, or Router API, read the matching versioned docs (`https://docs.expo.dev/versions/v<major>.0.0/`). Use `npx expo install <package>`. Run `npx tsc --noEmit` and `npx expo lint` before declaring a task done. Routes live in `src/app/`. Keep other code in `src/`. `@/` points to `src/`.

## Layout

```
app/src/
  app/               routes only: (tabs)/ (index, search, tickets, account), movie/[id], showtimes/[movieId], waiting-room/[showtimeId],
                     seats/[showtimeId], checkout/[showtimeId], confirming/[orderId], ticket/[bookingId], auth, gallery
  features/          movies, showtimes, seats, waitingRoom, orders, tickets, auth
  query/             QueryClient, persister, query key factories
  state/             zustand stores (selected seats, theme mode, UI)
  api/               typed client, error mapping, token refresh
  ui/                tokens.ts, theme.tsx, components/, seatmap/, errorMessages.ts, useHoldCountdown.ts   (tested reference)
```

## Rules

1. Server data through TanStack Query. Zustand for UI-only state. Tokens only in `expo-secure-store`.
2. All values come from `src/ui/tokens.ts`. All text through `<Text>`. All buttons through `<Button>`. No raw hex or spacing.
3. No gradients. Shadows only on BottomSheet, Toast, and the sticky booking bar.
4. Seats are memoized. Keep the seat map list picker for screen readers.
5. Poll availability every 3 seconds with `If-None-Match`, only while the screen is focused. Back off on errors.
6. The app never decides payment results and never builds TMDB URLs or prices.
7. Errors always through `toUxMessage`. Keep user input on failure.
8. Every screen has loading, empty, error, offline, and surge states. Both themes. Reduce motion respected.
9. Add every new component to the gallery and to `docs/COMPONENTS.md`.
10. If `ios/` and `android/` do not exist, do not create them by hand. Use `app.json` and config plugins.
