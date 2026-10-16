---
name: animation-haptics-and-motion
description: Use when adding Reanimated animations (screen transitions, seat selection, booking confirmation), haptic feedback, and reduce motion support to Matinee. Self-study topic: read the current Reanimated and Expo Haptics docs before coding.
---

# Animation, haptics, and motion

Self-study first: read the current Reanimated docs (shared values, animated styles, `withTiming`, `withSpring`, layout and entering animations) and Expo Haptics docs for your SDK. Reanimated 4 needs `react-native-worklets`, installed with `npx expo install`. In this stack, mutate shared values with `.set()` inside React event handlers, because the React Compiler lint rule rejects `.value =` there. Inside worklets and gesture callbacks `.value =` is fine.

## Principles

Motion explains change. It never decorates. Short (120 to 320 ms), standard easing, springs for taps. Everything respects the system "reduce motion" setting (check with `AccessibilityInfo.isReduceMotionEnabled()`, subscribe to changes).

## The three required animations

### 1. Screen transitions

Use the Expo Router stack with the platform default or a simple fade and slide (320 ms). Shared poster transition from MovieCard to the detail backdrop is a nice stretch (shared element transitions in Reanimated are marked experimental in docs, so check their status before relying on them). Reduce motion: use a plain cross fade or none.

### 2. Seat selection (done in `SeatMap.tsx`)

Selecting a seat: scale from 0.85 to 1 with `withSpring(1, motion.spring)`, fill color changes immediately (no color tween needed), check icon appears. Zoom and pan: gesture driven on the UI thread. Availability changes by other users: a short fade (150 ms) when a seat turns held or sold.

### 3. Booking confirmation (700 ms, build this)

Sequence: backdrop dims to the surface color, a circle scales in (spring), a check mark draws with an SVG stroke (`react-native-svg` plus an animated `strokeDashoffset`), the title fades up 8 dp, then a success haptic. Hold the final frame, then show "View ticket". Reduce motion: show the final state instantly with the haptic only.

## Haptics (`expo-haptics`)

| Moment | Call |
|---|---|
| Any button press | `impactAsync(Light)` (already in `Button`) |
| Seat toggled | `selectionAsync()` (already in `SeatMap`) |
| Seat limit reached, hold failed | `notificationAsync(Warning)` |
| Payment confirmed | `notificationAsync(Success)` |
| Error that blocks the user | `notificationAsync(Error)` |
| Admitted from waiting room | `notificationAsync(Success)` |

Wrap in `.catch(() => {})`. Haptics may be unsupported or disabled. Never use haptics as the only feedback.

## Performance

Animate only `transform` and `opacity`. Avoid animating layout props. Keep worklets small. No animation inside list items that are off screen. Test at 60 fps on a real mid-range phone with the Perf Monitor.

## Gallery and demo

Show the three animations in the gallery with a reduce motion switch. Record them in the demo video.

## Tests and checks

Manual on device: with "Remove animations" turned on in Android accessibility settings, the confirmation and seat pop become instant and nothing breaks. No frame drops while panning the seat map.

## Explain-back questions for the human

1. Why animate only transform and opacity?
2. What does reduce motion change in your app, and why must it work?
3. Why must a haptic never be the only feedback?
