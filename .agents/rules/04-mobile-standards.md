---
trigger: glob
globs: `app/**`
---

# Rule 04: Mobile app standards

**Activation:** Glob `app/**`.

## Platform

React Native, Expo (read the SDK version in `package.json` and the matching docs before using an API), Expo Router, TypeScript strict. Android development build via EAS. Use `npx expo install` for packages. Tabs, if you use them, come from `expo-router/js-tabs` in SDK 57 (the old export is deprecated).

## State

| Kind | Tool | Examples |
|---|---|---|
| Server state | TanStack Query | movies, showtimes, seat availability, orders, tickets |
| Client state | Zustand | selected seats (before the hold is confirmed), selected date, theme mode, queue UI |
| Persisted | Query persister (AsyncStorage) | My tickets (offline), recent searches |
| Secrets | expo-secure-store | access and refresh tokens |

Rules: never copy server data into Zustand. Query keys come from a factory per feature. Billing and order status are never persisted.

## Seat selection flow

1. Tapping a seat toggles it in local state immediately (optimistic).
2. The app sends `PUT /showtimes/:id/hold` with the full desired seat list (debounced 250 ms, one request in flight).
3. On success, store `holdId`, `expiresAt`, and `serverNow` from the response and start the countdown with `useHoldCountdown`.
4. On a 409, revert the seats listed in `unavailableSeatIds`, show a toast, keep the rest.
5. Poll `GET /showtimes/:id/availability` every 3 seconds with `If-None-Match`. A 304 changes nothing. Stop polling when the screen is not focused or the app is in the background.
6. Leaving the screen releases the hold (`DELETE`) unless the user is moving to checkout.

## Waiting room

Join on entering the showtimes flow for a hot showtime. If `QUEUED`, show the waiting screen, poll status every 2 seconds, and send a heartbeat join every 30 seconds once active. Handle app backgrounding: on return, re-join (the server keeps the same place).

## Payments

Open the hosted checkout in `expo-web-browser`. Return via deep link `matinee://checkout/return?orderId=...`. Then show Confirming and poll `GET /orders/:id`. The app never decides the result.

## Lists and images

FlashList for posters, showtimes, and tickets with `estimatedItemSize`. Posters use the `Poster` component (expo-image, placeholder, fade, `memory-disk` cache). Skeletons while loading. Every list has loading, empty, error, and end states.

## Offline and errors

Tickets are readable offline. Map every error code through `toUxMessage` in `app/src/ui/errorMessages.ts`. Never show raw server messages or codes. If a request fails, keep user input and offer Retry.

## Performance

Memoize list items and seats. Keep gesture work on the UI thread (Reanimated worklets). Do not create objects or functions inside seat render. Measure on a real mid-range Android device before claiming smoothness.

## Env and secrets

Only the three `EXPO_PUBLIC_` variables in `PRD.md` Appendix A. No TMDB or Paystack secrets, ever.

## Do not

- Do not store tokens in AsyncStorage.
- Do not compute prices, fees, or availability as the source of truth in the app.
- Do not use `useEffect` to fetch server data. Use TanStack Query.
- Do not call TMDB from the app.
