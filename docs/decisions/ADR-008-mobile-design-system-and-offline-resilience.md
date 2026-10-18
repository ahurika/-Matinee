# ADR-008: Mobile Design System, Tactile Motion, and Five-State Resilience

## Context
Matinee is a mobile-first cinema ticket booking application where user experience is evaluated on visual craft, architectural rigor, and usability under challenging cellular conditions. Film booking involves fast, high-stakes decisions where clear visual feedback, tactile confirmation, and accessible interactions prevent user mistakes.

## Decision
We enforce a comprehensive mobile design system and interface architecture:

1. **Token-Driven Dark Cinema Aesthetic:**
   - **Color System:** Grounded in a cinema-optimized dark palette (`#181210` obsidian base, `#1F1A18` container low, `#2B2421` container high, and warm cinema primary accent).
   - **Zero Gradients:** Surfaces strictly utilize solid tonal elevation tokens. No synthetic multi-color gradients.
   - **Shadows Restricted:** Elevation shadows are strictly reserved for floating physical layers (bottom sheets, modals, toast notifications, floating action bars).
   - **Typography:** Manrope type scale with strict semantic hierarchy (`display`, `title1`, `title2`, `title3`, `body`, `bodySmall`, `label`, `caption`).

2. **Tactile Haptic Feedback & Motion:**
   - Interactive events trigger native physical feedback via `expo-haptics`:
     - Seat selection toggle: `ImpactFeedbackStyle.Light`.
     - Seat hold limit reached (8 seats maximum): `NotificationFeedbackType.Warning`.
     - Booking confirmation & ticket generation: `NotificationFeedbackType.Success`.
     - Payment error or timeout: `NotificationFeedbackType.Error`.
   - Motion transitions utilize React Native Reanimated with spring physics for smooth, natural gestures.

3. **Five Mandatory Screen States:**
   Every mobile screen implements five distinct visual states:
   - **Loading State:** Dimension-matched `Skeleton` elements preserving layout geometry (eliminating layout shift).
   - **Empty State:** `EmptyState` component featuring cinema iconography, empathetic copy, and actionable recovery buttons.
   - **Error State:** Humanized error translation via `toUxMessage()`, converting backend error codes (`SEAT_TAKEN`, `SEAT_LIMIT`, `UPSTREAM_TIMEOUT`) into clear actionable next steps.
   - **Offline State:** Cached metadata rendered seamlessly with subtle indicator badges and automatic query refetching on network reconnect.
   - **Surge State:** Interactive waiting room queue with live position counter, countdown pill, and automatic admission redirection.

4. **Inclusive Accessibility Architecture:**
   - All interactive elements include explicit `accessibilityRole` and descriptive `accessibilityLabel` attributes.
   - **Dual Seat Selection:** Alongside the visual 2D interactive canvas map, an accessible list-based seat picker (`SeatListPicker`) is provided. The screen detects screen readers via `AccessibilityInfo.isScreenReaderEnabled()` to activate list mode automatically.

## Consequences
- The mobile application presents a consistent, polished dark-mode cinema experience on iOS and Android.
- Users receive immediate tactile and visual confirmation for every seat reservation step.
- Full accessibility compliance for visually and motor-impaired cinema attendees.
