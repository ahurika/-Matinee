---
name: design-tokens-and-component-library
description: Use when building or changing Matinee design tokens or any UI component: Button, Text, Card, MovieCard, Input, Chip, Badge, BottomSheet, Skeleton, Toast, EmptyState, SeatMap, plus the hidden component gallery and docs/COMPONENTS.md. Tokens and several components are already written and verified in app/src/ui.
---

# Design tokens and the component library

Read `docs/DESIGN.md` first. The brief grades this part harshly: tokens, 12 or more components, each using only tokens, each documented, plus a living gallery.

## Tokens (`app/src/ui/tokens.ts`, done)

Colors (dark and light role sets generated and contrast-checked), `space` (4 dp grid), `radius`, `fontFamily` and `typeScale` (Manrope), `shadows` (none, sm, md, lg), `motion` (durations, easing, spring), `size` (min target 44, seat 28). `theme.tsx` gives `useTheme()` with `colors`, `isDark`, and `shadow(level)`.

Rules:
- No raw hex, no raw spacing, no raw font size outside `tokens.ts`. Two deliberate exceptions, both documented: the QR tile (black on white) and the poster scrim (black at 55 percent).
- To change the brand color: regenerate the scheme (seed in the file header) and replace the two color blocks. Practice the interview demo: change `primary` in `tokens.ts` and watch every button, selected seat, and tab change.
- Install fonts with `npx expo install expo-font @expo-google-fonts/manrope`. The root layout loads them before rendering.

## Components already written (verified: type-check, lint, bundle)

| Component | File | Notes |
|---|---|---|
| Text | `components/Text.tsx` | 9 variants, any color role, scales with system font (cap 2x) |
| Button | `components/Button.tsx` | primary, secondary, outline, text, destructive. md and lg. loading, disabled. Press scale animation and light haptic. Uses `scale.set()` (the React Compiler lint rejects `.value =` in handlers) |
| Skeleton | `components/Skeleton.tsx` | Opacity pulse, no gradient, honors reduce motion, hidden from screen readers |
| Poster | `components/Poster.tsx` | expo-image, solid placeholder, 200 ms fade, memory-disk cache, 2:3 ratio |
| TicketQr | `components/TicketQr.tsx` | QR on a white tile with quiet zone |
| SeatMap | `seatmap/` | See skill `seatmap-component` |

## Components to build (props are the contract, keep them small)

```ts
Card:        { variant?: 'filled' | 'outlined'; onPress?: () => void; children; accessibilityLabel? }
MovieCard:   { movie: { id; title; posterUrl; rating }; width: number; onPress: () => void; comingSoonDate?: string }
             // loading state is <MovieCardSkeleton width />. Poster + 2 lines of text. No shadow.
Input:       { label; value; onChangeText; error?: string; helper?: string; secure?: boolean; leading?: ReactNode; ...TextInputProps }
             // states: default, focused (primary border), error (error border + message + icon), disabled
Chip:        { label; selected?: boolean; tone?: 'neutral' | 'info' | 'warning' | 'error' | 'success'; icon?; onPress? }
Badge:       { count?: number; dot?: boolean; tone?: 'primary' | 'error' }   // count caps at 9+
BottomSheet: { visible; onDismiss; snapPoints: number[] (fractions); children; title? }
Toast:       ToastProvider + useToast().show({ message; tone; actionLabel?; onAction? })
EmptyState:  { icon; title; message; actionLabel?; onAction? }
Dialog:      { visible; title; message; confirmLabel; cancelLabel; destructive?; loading?; onConfirm; onDismiss }
CountdownPill: { label: string; tone: 'normal' | 'warning' | 'expired' }
```

Every component: uses `useTheme()` and tokens only, sets `accessibilityRole` and `accessibilityLabel`, has at least a 44 dp target when pressable, supports loading or disabled where it makes sense, and has no inline magic numbers.

### BottomSheet (build it yourself, outline)

Reanimated `translateY` shared value from sheet height to 0 (open). `Gesture.Pan()` follows the finger, on end snaps to the nearest snap point or dismisses if dragged down fast (velocity above a threshold). Backdrop is a `Pressable` with opacity linked to translateY. Use `accessibilityViewIsModal` so screen readers stay inside. Corner radius `xl` on top, shadow `lg`, drag handle 4 by 32 dp. Animations 320 ms standard easing, no animation if reduce motion is on.

### Toast (build it yourself, outline)

Provider holds a queue (one visible at a time). Slides in from the top (or above the sticky bar) with a spring, auto dismisses after 4 seconds, swipe to dismiss, optional action. Announce with `accessibilityLiveRegion="polite"` (use `assertive` for errors). Shadow `md`. Haptic: warning for error, success for success.

### Input (outline)

Label above or floating, 48 dp high, radius `md`, border `outline`, focus border `primary` 2 dp, error border `error` plus an icon and message below (message announced to screen readers). Password field has a show or hide toggle with a label.

## Hidden gallery route

`app/src/app/gallery.tsx`, not in any tab, opened by a long press on the version number in Account. One section per component with every variant and state side by side (default, pressed where feasible, loading, disabled, error, skeleton, dark and light via a switch at the top, large text via a switch). Include the seat map in all states and the full color and type token swatches. This is your living style guide and a great demo clip.

## docs/COMPONENTS.md template

For each component write: purpose, props table (name, type, default, description), variants, states, tokens used, accessibility notes, usage example, and a screenshot from the gallery.

## Build order

Text, Button (done) -> Skeleton, Poster (done) -> Card, Chip, Badge, Input -> MovieCard, EmptyState -> Dialog -> BottomSheet, Toast -> CountdownPill -> SeatMap (done) -> gallery. Run `npx tsc --noEmit` and `npx expo lint` after each.

## Stretch

Publish `SeatMap` as an npm package with its own README. It depends on `react-native-reanimated`, `react-native-gesture-handler`, `expo-haptics`, and `@expo/vector-icons` (peer dependencies), takes colors through props or a theme object instead of importing the app's tokens. Counts toward Part 1's edge projects.

## Explain-back questions for the human

1. Where are the design tokens defined? Change one color in front of me.
2. Why do components import tokens instead of using literal values?
3. Why is there a gallery, and what would it catch?
