# Matinee Component Library & Design System Documentation

All components are built strictly from design tokens defined in [`app/src/ui/tokens.ts`](file:///c:/Users/USER/Desktop/Matinee/app/src/ui/tokens.ts). No raw hex color codes, magic numbers, or ad-hoc margins are used outside the token files. Shadows are strictly restricted to floating layers (`BottomSheet`, `Toast`, and sticky action bars), and cards utilize flat tonal background elevations and 1 dp borders.

A living, interactive preview of every component across all states and themes is available in the hidden gallery route at [`app/src/app/gallery.tsx`](file:///c:/Users/USER/Desktop/Matinee/app/src/app/gallery.tsx).

---

## 1. Text (`Text.tsx`)

### Purpose
Renders typography adhering to the Manrope type scale, with automatic theme-aware color mapping and dynamic system font scaling up to 2.0x.

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'display' \| 'title1' \| 'title2' \| 'title3' \| 'body' \| 'bodySmall' \| 'label' \| 'caption' \| 'overline'` | `'body'` | Typography scale preset mapping size, line height, weight, and tracking. |
| `color` | `ColorRole` | `'onSurface'` | Semantic color role from the active theme. |
| `children` | `ReactNode` | Required | Text content or nested spans. |
| `style` | `StyleProp<TextStyle>` | `undefined` | Optional style overrides (excluding raw font-family/size). |

### Tokens Used
- `typeScale`: `display`, `title1`, `title2`, `title3`, `body`, `bodySmall`, `label`, `caption`, `overline`
- `fontFamily`: `Manrope_400Regular`, `Manrope_500Medium`, `Manrope_600SemiBold`, `Manrope_700Bold`
- `colors`: All semantic `ColorRole` values (`onSurface`, `onSurfaceVariant`, `primary`, etc.)

### Accessibility
- `maxFontSizeMultiplier={2}`: Preserves readability for users with large text preferences while preventing UI overflow.

---

## 2. Button (`Button.tsx`)

### Purpose
Primary interaction element supporting 5 visual variants, 2 sizes, press spring animations, and tactile haptic feedback.

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | Required | Text label displayed on the button and used as screen reader label. |
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'text' \| 'destructive'` | `'primary'` | Visual style role. |
| `size` | `'md' \| 'lg'` | `'md'` | Height: `md` (44 dp min target) or `lg` (52 dp). |
| `loading` | `boolean` | `false` | Shows activity indicator and disables press. |
| `disabled` | `boolean` | `false` | Inactive state with dimmed opacity. |
| `fullWidth` | `boolean` | `false` | Expands width to fill parent container. |
| `haptic` | `boolean` | `true` | Triggers light impact haptic feedback on press. |
| `leading` | `ReactNode` | `undefined` | Optional leading icon. |

### Tokens Used
- `radius`: `md` (12 dp)
- `motion`: `duration.fast` (120 ms), `scale: 0.97`
- `size`: `minTarget` (44 dp)
- `colors`: `primary`, `onPrimary`, `secondaryContainer`, `onSecondaryContainer`, `errorContainer`, `onErrorContainer`, `outline`

---

## 3. Card (`Card.tsx`)

### Purpose
Surface container for grouping related content. Complies with the "no shadows on cards" rule by using tonal surface elevation.

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | Required | Content inside the card. |
| `variant` | `'filled' \| 'outlined'` | `'filled'` | `filled` uses `surfaceContainerLow`; `outlined` uses `outlineVariant` border. |
| `onPress` | `() => void` | `undefined` | If provided, transforms card into an interactive pressable with scale motion. |
| `accessibilityLabel` | `string` | `undefined` | Screen reader label for interactive cards. |
| `haptic` | `boolean` | `true` | Haptic click on interactive press. |

### Tokens Used
- `radius`: `md` (12 dp)
- `space`: `space[4]` (16 dp internal padding)
- `colors`: `surfaceContainerLow`, `surface`, `outlineVariant`

---

## 4. Input (`Input.tsx`)

### Purpose
Text entry field with dedicated floating/top labels, secure password toggling, inline error messages, and helper text.

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | Required | Field label displayed above input. |
| `value` | `string` | Required | Controlled input value. |
| `onChangeText` | `(text: string) => void` | Required | Callback on text change. |
| `error` | `string` | `undefined` | Error message displayed below input in error state. |
| `helper` | `string` | `undefined` | Informational helper text below input. |
| `secure` | `boolean` | `false` | Password masking with show/hide toggle icon. |
| `leading` | `ReactNode` | `undefined` | Optional leading icon (e.g. search magnifying glass). |
| `disabled` | `boolean` | `false` | Disables interaction and dims opacity to 50%. |

### Tokens Used
- `size`: Height 48 dp
- `radius`: `md` (12 dp)
- `colors`: `surfaceContainerHigh`, `outline`, `primary` (2 dp on focus), `error` (2 dp on error), `onSurface`

### Accessibility
- Error message has `accessibilityRole="alert"` and `accessibilityLiveRegion="assertive"`.
- Password visibility button has explicit `accessibilityLabel` ("Show password" / "Hide password").

---

## 5. Chip (`Chip.tsx`)

### Purpose
Compact interactive tag for filtering showtimes, seating classes, and displaying status notes.

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | Required | Chip label text. |
| `selected` | `boolean` | `false` | Selected highlight state. |
| `tone` | `'neutral' \| 'info' \| 'warning' \| 'error' \| 'success'` | `'neutral'` | Color tone. |
| `icon` | `ReactNode` | `undefined` | Optional leading icon. |
| `onPress` | `() => void` | `undefined` | Tap callback with hitSlop to ensure 44 dp touch target. |

### Tokens Used
- `size`: Height 32 dp (with `hitSlop` 44 dp)
- `radius`: `pill` (999 dp)
- `colors`: `primaryContainer`, `onPrimaryContainer`, `infoContainer`, `warningContainer`, `errorContainer`, `successContainer`

---

## 6. Badge (`Badge.tsx`)

### Purpose
Notification or count indicator for cart items, ticket counts, or unread updates.

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `count` | `number` | `undefined` | Number to display. Automatically caps at `9+`. |
| `dot` | `boolean` | `false` | If true, renders an 8 dp indicator dot instead of a number pill. |
| `tone` | `'primary' \| 'error'` | `'primary'` | Color tone. |

### Tokens Used
- `radius`: `pill` (999 dp), dot radius 4 dp
- `colors`: `primary`, `onPrimary`, `error`, `onError`

---

## 7. CountdownPill (`CountdownPill.tsx`)

### Purpose
Displays real-time hold expirations and waiting room queue countdowns with progressive urgency coloring.

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | Required | Formatted time string (e.g. `"04:59"`, `"Expired"`). |
| `tone` | `'normal' \| 'warning' \| 'expired'` | `'normal'` | Tone state: normal (`clock-outline`), warning (`timer-sand`), expired (`timer-off`). |

### Tokens Used
- `size`: Height 28 dp
- `radius`: `pill` (999 dp)
- `colors`: `surfaceContainerHigh`, `warningContainer`, `onWarningContainer`, `errorContainer`, `onErrorContainer`

---

## 8. MovieCard & MovieCardSkeleton (`MovieCard.tsx`)

### Purpose
Showcases cinema films in browsing carousels and search grids with standard 2:3 aspect ratio posters and metadata.

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `movie` | `{ id; title; posterUrl?; rating? }` | Required | Film metadata. |
| `width` | `number` | Required | Card width in density-independent pixels. |
| `onPress` | `() => void` | Required | Tap action navigating to film details. |
| `comingSoonDate` | `string` | `undefined` | Optional release date badge (e.g. `"24 Oct"`). |

### Tokens Used
- Aspect ratio: 2:3 (`size.poster`)
- `radius`: `md` (12 dp)
- `motion`: Press scale 0.97
- `colors`: `onSurface`, `onSurfaceVariant`, `warning` (rating star)

---

## 9. Poster (`Poster.tsx`)

### Purpose
Renders film posters using `expo-image` with disk/memory caching, solid placeholders, and 200 ms cross-fades.

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `path` | `string \| null` | Required | TMDB poster path or full URL. |
| `width` | `number` | Required | Image width in dp. |
| `height` | `number` | Required | Image height in dp. |
| `alt` | `string` | Required | Accessible image description. |

---

## 10. Skeleton (`Skeleton.tsx`)

### Purpose
Content placeholder pulse animation without gradient shimmers, honoring `AccessibilityInfo.isReduceMotionEnabled`.

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number \| string` | `'100%'` | Width in dp or percentage. |
| `height` | `number` | `16` | Height in dp. |
| `borderRadius` | `number` | `radius.xs` (4 dp) | Corner radius. |

---

## 11. EmptyState (`EmptyState.tsx`)

### Purpose
Zero-data fallback presentation for empty search results, no booked tickets, or offline cinema sessions.

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `MaterialCommunityIcons` | `'filmstrip-off'` | Centered icon illustration (size 48). |
| `title` | `string` | Required | Primary header message. |
| `message` | `string` | Required | Sub-description guiding next steps (max 280 dp wide). |
| `actionLabel` | `string` | `undefined` | Optional button label. |
| `onAction` | `() => void` | `undefined` | Callback when action button is pressed. |

---

## 12. Dialog (`Dialog.tsx`)

### Purpose
Modal alert and confirmation prompt for high-impact actions (cancellations, hold abandonment, sign-out).

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `visible` | `boolean` | Required | Visibility toggle. |
| `title` | `string` | Required | Dialog title. |
| `message` | `string` | Required | Explanation message. |
| `confirmLabel` | `string` | Required | Primary confirmation button label. |
| `cancelLabel` | `string` | `'Cancel'` | Dismissal button label. |
| `destructive` | `boolean` | `false` | Sets confirm button to destructive red styling. |
| `loading` | `boolean` | `false` | Disables buttons and shows spinner on confirm. |
| `onConfirm` | `() => void` | Required | Confirm callback. |
| `onDismiss` | `() => void` | Required | Cancel/dismiss callback. |

### Tokens Used
- Backdrop: 55% flat black scrim (`scrim`)
- Card: `surfaceContainerLow`, `radius.lg` (16 dp), `space[5]` (20 dp) padding
- Accessibility: `accessibilityViewIsModal`, `accessibilityRole="alert"`

---

## 13. BottomSheet (`BottomSheet.tsx`)

### Purpose
Floating contextual sheet for order summaries, cinema selection, and payment confirmation.

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `visible` | `boolean` | Required | Visibility toggle. |
| `onDismiss` | `() => void` | Required | Dismiss callback. |
| `title` | `string` | `undefined` | Optional header title. |
| `children` | `ReactNode` | Required | Content inside the sheet. |

### Motion & Physics
- Animated `translateY` shared value.
- Drag handle: 4 by 32 dp in `colors.outline`.
- `Gesture.Pan()` follows finger drag and dismisses on downward velocity (> 600 dp/s) or distance (> 150 dp).
- Backdrop opacity interpolated dynamically from translateY.
- Shadow: `shadow('lg')`.

---

## 14. Toast & ToastProvider (`Toast.tsx`)

### Purpose
Global notification banner for asynchronous feedback (payment success, seat hold conflict, network alerts).

### Usage
Wrap app root in `<ToastProvider>`:
```tsx
const toast = useToast();
toast.show({
  message: 'Payment confirmed! Tickets issued.',
  tone: 'success',
  actionLabel: 'View Ticket',
  onAction: () => navigateToTicket(),
});
```

### Tokens Used
- Spring physics: `motion.spring` (damping 18, stiffness 220, mass 0.8)
- Shadow: `shadow('md')`
- Auto-dismiss: 4000 ms, swipe-up to dismiss gesture
- Haptic: `Haptics.notificationAsync` (Warning for error, Success for confirmed)

---

## 15. TicketQr (`TicketQr.tsx`)

### Purpose
Renders signed, HMAC-verified QR tickets for venue turnstiles and operator scanners.

### Rules & Tokens
- **Intentional Exception:** QR code uses `#000000` on `#FFFFFF` with `radius.lg` (16 dp) white tile to guarantee camera optical scanner contrast regardless of whether device is in dark mode.
- Includes quiet zone padding (`space[4]`).

---

## 16. SeatMap (`seatmap/SeatMap.tsx`)

### Purpose
Pinch-to-zoom, pan-enabled interactive seat selection grid supporting 320 seats per screen, wheelchair accessible aisles, and memoized per-seat render cycles.

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `seats` | `Seat[]` | Required | Array of seats with status (`available`, `held`, `sold`). |
| `selectedIds` | `ReadonlySet<string>` | Required | Set of currently selected seat IDs. |
| `maxSelectable` | `number` | `8` | Maximum tickets per transaction. |
| `onToggle` | `(seat, selected) => void` | Required | Toggle callback. |
| `availableWidth` | `number` | Required | Viewport width used to calculate fit-to-width start zoom. |

### Motion & Performance
- Each `SeatButton` is wrapped in `React.memo` to avoid re-rendering 320 items when a single seat is tapped.
- Micro-spring pop feedback: scale pops to 0.85 and returns to 1 on selection change.
- Integrated simultaneous Pan and Pinch gestures with bounded zoom limits.

---

## 17. ConfirmationCelebration (`components/ConfirmationCelebration.tsx`)

### Purpose
High-impact animated celebration screen rendered upon successful webhook confirmation of an order. Features a dynamic SVG stroke-dashoffset checkmark drawing animation, spring circle expansion, staggered text emergence, tactile success haptics, and complete Respects-Reduce-Motion fallback.

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | Required | Main celebration heading (e.g. "Booking Confirmed!"). |
| `subtitle` | `string` | Required | Supporting context (e.g. "Seats locked & HMAC-signed QR ticket issued."). |

### Motion & Haptics Choreography
- **0 ms:** Haptic success notification (`Haptics.notificationAsync(Success)`) triggers immediately on mount. Circle expands with Reanimated spring physics (`damping: 18, stiffness: 220, mass: 0.8`).
- **150 ms:** Checkmark draws along its path using animated SVG `strokeDashoffset` from 35 to 0 over 360 ms.
- **300 ms:** Title and subtitle fade up with 8 dp vertical translation.
- **Accessibility:** Detects `AccessibilityInfo.isReduceMotionEnabled()`: if user prefers reduced motion, animations bypass easing curves and immediately display at final opacity 1 and scale 1 with 0 ms delay.

---

## 18. SeatListPicker (`seatmap/SeatListPicker.tsx`)

### Purpose
WCAG 2.1 AAA accessible alternative to the 2D pan/zoom spatial seat map. Enables screen reader users (TalkBack on Android, VoiceOver on iOS) and motor-impaired users to select cinema seats reliably without navigating an infinite spatial canvas.

### Props Table
| Prop | Type | Default | Description |
|---|---|---|---|
| `visible` | `boolean` | Required | Controls modal sheet presentation. |
| `onClose` | `() => void` | Required | Dismiss handler. |
| `seats` | `Seat[]` | Required | Flat array of cinema seats with availability status. |
| `selectedIds` | `ReadonlySet<string>` | Required | Currently selected seat IDs. |
| `onToggle` | `(seat: Seat, nextSelected: boolean) => void` | Required | Callback when user selects or deselects a seat. |

### Accessibility & Interaction Architecture
- **Automatic Detection:** Screen triggers `AccessibilityInfo.isScreenReaderEnabled()` on mount in `app/src/app/seats/[showtimeId].tsx`; automatically presents `SeatListPicker` when a screen reader is active, while maintaining a prominent header toggle for all users.
- **Touch Target Dimensions:** Every seat item occupies a minimum 52 dp row height (exceeding the 44x44 dp minimum).
- **Semantics & Announcements:** Each seat button has full accessibility properties:
  - `accessibilityRole="checkbox"`
  - `accessibilityState={{ checked: isSelected, disabled: isUnavailable }}`
  - Descriptive labels: `Row A, Seat 1, Premium, NGN 4,500. Currently available. Tap to select.`
- **Row Switcher:** Horizontal filter chips (`Row A`, `Row B`, etc.) allow immediate jumping to specific tiers and rows without scrolling through 320 items sequentially.

