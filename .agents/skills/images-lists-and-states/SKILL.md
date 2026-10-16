---
name: images-lists-and-states
description: Use when building Matinee lists and image loading: expo-image posters with placeholders and caching, FlashList grids, skeleton screens, designed empty, error, offline, and degraded states. A blank screen is a bug.
---

# Images, lists, and states

## Images

- Use `Poster` (expo-image): solid placeholder tone, 200 ms fade, `cachePolicy="memory-disk"`, `recyclingKey` so reused cells do not flash the wrong poster, accessibility label "Poster for {title}".
- The backend returns final image URLs sized for the use (poster `w342`, backdrop `w780`, profile `w185`). The app never builds or guesses TMDB URLs. For a retina hero you can ask the backend for a larger size.
- Prefetch the next screen's backdrop when the user taps a card (`Image.prefetch`).
- If there is no image, show the placeholder block with the title text, not a broken image icon.
- Decide on blurhash or thumbhash placeholders only if you generate them yourself. TMDB does not provide them. A solid tone is fine and honest.

## Lists (FlashList)

- Posters grid: `numColumns={2}` (3 on tablets), `estimatedItemSize`, memoized `MovieCard`, stable `keyExtractor` (movie id), `getItemType` if items differ.
- Showtimes and tickets: `FlashList` with section headers or a flat list with header rows.
- Avoid inline functions and objects in `renderItem`. Keep cards cheap (one image, two text lines).
- Pagination: now playing is one page (about 20) from our backend, so infinite scroll is not needed. Search results use a simple page.
- Verify smooth scroll on a real phone with 200 items (seed a test list in the gallery).

## States (every screen)

| State | What to show |
|---|---|
| Loading | Skeleton that matches the final layout (hero block, poster grid, row of posters, showtime chips). No full-screen spinners |
| Empty | Icon, title, one sentence, one action. Examples: "No showtimes yet. Check back soon." / "No tickets yet. Your tickets will show up here after you book." / "No results for 'xyz'." |
| Error | Icon, title and message from `toUxMessage`, "Try again" |
| Offline | Banner "You are offline. Showing saved tickets." Cached tickets still open |
| Degraded (TMDB) | Quiet note "Showing saved details" |
| Surge | Waiting room screen, or "Matinee is busy right now" with Retry |
| Cancelled showtime | Warning banner on the ticket with the refund message |

## Skeletons

Match the real layout dimensions so nothing jumps when data arrives. Use `Skeleton` blocks (opacity pulse, no gradient shimmer). Keep them under 1 second of visible time in normal conditions. Hide them from screen readers and give the screen a polite "Loading" announcement.

## Query integration

TanStack Query `isPending` shows skeletons, `isError` shows the error state, `isFetching` with data shows a thin progress indicator at the top (not a skeleton). Keep previous data while refetching (`placeholderData: keepPreviousData`) for search and date changes.

## Tests and checks

For each screen, a manual or component test for loading, empty, error, and offline. Take screenshots of each state for `docs/COMPONENTS.md` and the demo.

## Explain-back questions for the human

1. Why a skeleton and not a spinner?
2. What does `recyclingKey` prevent in a list?
3. What does the user see when the poster URL is missing or fails?
