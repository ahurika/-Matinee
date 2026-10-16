---
name: accessibility-and-responsive-ui
description: Use when checking or fixing Matinee accessibility and responsive layout: 4.5 to 1 contrast, accessibility labels on every button and image, text scaling to 200 percent, 44 by 44 point targets, screen reader flows including the list-based seat picker, dark mode design, and small and large phone layouts.
---

# Accessibility and responsive UI

## The four graded rules

1. **Contrast 4.5 to 1** for text against its background (WCAG AA). Token pairs are verified (`docs/DESIGN.md` section 2.3). Text on posters sits on a solid 55 percent black scrim or a surface block. Check contrast on the real image, not the mock. Use a contrast checker on screenshots for any text over an image.
2. **Every button and image has an accessibility label.** `Button` uses its label. Icon-only buttons need an explicit `accessibilityLabel`. `Poster` labels itself. Decorative images use `accessible={false}`.
3. **Text scales** when the user increases font size. Use `Text` (scales by default, capped at 2x). Test at the largest Android font size. Layouts wrap or scroll. Never set `allowFontScaling={false}`. Avoid fixed heights on text containers.
4. **Touch targets at least 44 by 44.** `Button` min height 44. Tab bar destinations are full width. Seats: see the seat map skill (zoom plus list picker). Add `hitSlop` to small icons.

## Screen reader flows (TalkBack on Android)

- Turn on TalkBack and complete a booking with your eyes closed. Fix every dead end.
- Order: header, content, primary action. Group related text (title, time, price) with `accessible` and one combined label ("Dune Part Three, 7:30 PM, screen 2, 24 seats left").
- Dialogs and sheets set `accessibilityViewIsModal` and move focus in, then restore it on close.
- Errors and the countdown warning use `accessibilityLiveRegion` ("assertive" for errors, "polite" for strength and status changes).
- Seat map: labelled seats plus the list picker (opens by default when a screen reader is on).
- Selected, disabled, busy, and expanded states are exposed through `accessibilityState`.
- Do not rely on color alone: seat states use icons and labels, chips use text, the timer warning also changes the text.

## Dark and light

Dark is the reference theme and it is designed, not inverted: surfaces are warm near-black tones, text is warm off-white, accent is a lighter orange, posters are never tinted. Check every screen in both on a real phone. Shadows are softened in dark mode.

## Responsive layout

- Test at 360 by 640, 360 by 800, 412 by 915, and a tablet width (600 or more). Use `useWindowDimensions`.
- Safe areas: `react-native-safe-area-context` insets for the status bar, gesture bar, and the sticky bottom bar.
- Poster grid: 2 columns under 600 dp, 3 at 600 or more. Cap content width on tablets (about 720) and center it.
- Seat map: fit-to-width start zoom (done), taller map on tablets, landscape support optional.
- Keyboard: the sign up and search screens keep the focused field and primary button visible.
- Sticky bars use `insets.bottom`. Nothing is hidden under the system navigation bar.

## Reduce motion and haptics

Honor reduce motion everywhere (skeleton, seat pop, confirmation, transitions). Haptics are extra feedback only.

## Checklist (put the results in `docs/COMPONENTS.md`)

- [ ] Contrast verified for tokens and for text on posters
- [ ] Labels on all buttons, icon buttons, images, seats
- [ ] 200 percent text size: Home, detail, showtimes, checkout, ticket all usable
- [ ] 44 dp targets verified (seat map exception explained)
- [ ] TalkBack booking flow completed
- [ ] Dark and light both checked
- [ ] Small phone (360 wide) and large phone and tablet checked
- [ ] Reduce motion on: no broken screens

## Explain-back questions for the human

1. Which four accessibility rules does the brief require, and where does each live in the code?
2. How does a screen reader user pick seats?
3. What does text scaling break first in your layouts, and how did you fix it?
