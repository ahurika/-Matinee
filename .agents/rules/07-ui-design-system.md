---
trigger: glob
globs: `app/**`. Also Model Decision.
---

# Rule 07: UI and design system

**Activation:** Glob `app/**`. Also Model Decision.

Read `docs/DESIGN.md` before building or changing any screen.

## Tokens and components

1. All values come from `app/src/ui/tokens.ts`: color roles, space, radius, typography, shadows, motion, sizes. No raw hex, no off-grid spacing, no random font sizes. Change a color once, in tokens.
2. Read theme colors with `useTheme()`. Support dark and light. Dark is the reference.
3. All text uses `<Text variant="...">`. All buttons use `<Button>`. Build new components in `src/ui/components/` from tokens only, then add them to the gallery (`/gallery`) in every state and to `docs/COMPONENTS.md`.
4. Component library minimum: Button, Text, Card, MovieCard, Input, Chip, Badge, BottomSheet, Skeleton, Toast, EmptyState, SeatMap. Each documents variants, states, and props.
5. Build BottomSheet and Toast yourself with Reanimated and Gesture Handler. Do not import a ready-made sheet or toast library (the brief grades the build).

## Visual rules

1. No gradients anywhere. Text on images sits on a solid 55 percent black scrim or on a surface block.
2. Shadows only on floating layers (BottomSheet `lg`, Toast `md`, sticky booking bar `sm`). Cards and lists use tone and 1 dp borders.
3. One accent (primary) per screen, for the main action and the selected state.
4. No glass, blur, neon, emoji icons, stock illustration, or decorative shapes.
5. One icon family (Material Symbols). Outlined when idle, filled when selected.
6. Real content in designs and tests. No lorem ipsum.

## Seat map

Use `SeatMap` in `src/ui/seatmap/`. Seat states differ by fill, border, and icon, never by color alone. Seats are memoized. Never add per-seat inline functions or objects. Keep the list-based seat picker for screen readers.

## Motion and haptics

Reanimated for screen transitions, seat selection, and the booking confirmation. Haptics on seat toggle, limit reached, and payment success. Check "reduce motion" and skip non-essential animation.

## Loading, empty, error

Skeletons that match the layout (no gradient shimmer). Every screen has loading, empty, error, offline, and surge states. Error copy comes from `toUxMessage`. A blank screen is a bug.

## Accessibility

Contrast 4.5 to 1 for text, 3 to 1 for borders and icons. Every button, icon button, image, and seat has an `accessibilityLabel`. Text scales to 200 percent. Touch targets at least 44 by 44 dp (seats use zoom plus the list picker). Never rely on color alone. Announce errors and countdown warnings with live regions.

## Copy

Sentence case, short, active voice, no exclamation marks. Buttons are verbs ("Continue to payment", "View ticket"). Prices from kobo: "N4,500". Times in the cinema's local time.

## Review checklist

- [ ] Only tokens and library components
- [ ] No gradients, shadows only on floating layers
- [ ] All states present
- [ ] Dark and light checked
- [ ] Labels, targets, text scaling checked
- [ ] Component added to gallery and COMPONENTS.md
- [ ] `npx tsc --noEmit` and `npx expo lint` clean
