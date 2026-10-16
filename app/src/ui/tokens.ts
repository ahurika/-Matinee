// Matinee design tokens. The ONLY place raw values live. Components import from here.
// Colors: Material 3 style roles, generated from seed #E8590C (hue 40) with @material/material-color-utilities
// tone mapping. Surfaces use a low chroma neutral palette, the accent is vivid. Dark is the primary theme.
// To change the brand color, regenerate the scheme. Do not edit hex values by hand.

export const darkColors = {
  primary: '#ffb598',
  onPrimary: '#591c00',
  primaryContainer: '#7f2b00',
  onPrimaryContainer: '#ffdbce',
  secondary: '#e7beaf',
  onSecondary: '#442a20',
  secondaryContainer: '#5d4035',
  onSecondaryContainer: '#ffdbce',
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  background: '#181210',
  onBackground: '#ede0dc',
  surface: '#181210',
  onSurface: '#ede0dc',
  surfaceVariant: '#53433e',
  onSurfaceVariant: '#d8c2ba',
  outline: '#a08d86',
  outlineVariant: '#53433e',
  inverseSurface: '#ede0dc',
  inverseOnSurface: '#362f2c',
  inversePrimary: '#a63b00',
  scrim: '#000000',
  surfaceDim: '#181210',
  surfaceBright: '#3f3835',
  surfaceContainerLowest: '#120d0b',
  surfaceContainerLow: '#201a18',
  surfaceContainer: '#251e1c',
  surfaceContainerHigh: '#2f2826',
  surfaceContainerHighest: '#3a3331',
  success: '#a7d567',
  onSuccess: '#203600',
  successContainer: '#314f00',
  onSuccessContainer: '#c2f280',
  warning: '#ffb787',
  onWarning: '#512400',
  warningContainer: '#723600',
  onWarningContainer: '#ffdcc7',
  info: '#b9c3ff',
  onInfo: '#00228a',
  infoContainer: '#243ca1',
  onInfoContainer: '#dde1ff',
} as const;

export const lightColors = {
  primary: '#a63b00',
  onPrimary: '#ffffff',
  primaryContainer: '#ffdbce',
  onPrimaryContainer: '#370e00',
  secondary: '#77574b',
  onSecondary: '#ffffff',
  secondaryContainer: '#ffdbce',
  onSecondaryContainer: '#2c160d',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#410002',
  background: '#fff8f6',
  onBackground: '#201a18',
  surface: '#fff8f6',
  onSurface: '#201a18',
  surfaceVariant: '#f5ded6',
  onSurfaceVariant: '#53433e',
  outline: '#85736d',
  outlineVariant: '#d8c2ba',
  inverseSurface: '#362f2c',
  inverseOnSurface: '#fbeeea',
  inversePrimary: '#ffb598',
  scrim: '#000000',
  surfaceDim: '#e4d7d3',
  surfaceBright: '#fff8f6',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#fef1ed',
  surfaceContainer: '#f8ebe7',
  surfaceContainerHigh: '#f2e5e1',
  surfaceContainerHighest: '#ede0dc',
  success: '#426900',
  onSuccess: '#ffffff',
  successContainer: '#c2f280',
  onSuccessContainer: '#112000',
  warning: '#964900',
  onWarning: '#ffffff',
  warningContainer: '#ffdcc7',
  onWarningContainer: '#311300',
  info: '#3f56ba',
  onInfo: '#ffffff',
  infoContainer: '#dde1ff',
  onInfoContainer: '#001257',
} as const;

export type ColorRole = keyof typeof darkColors;
export type ColorScheme = { [K in ColorRole]: string };

// Spacing: 4 dp grid.
export const space = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64,
} as const;

// Radii.
export const radius = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

// Typography. Family is Manrope (loaded in the root layout). One family, weights carry the hierarchy.
export const fontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

export const typeScale = {
  display: { family: 'bold', size: 32, line: 40, tracking: -0.5 },
  title1: { family: 'bold', size: 24, line: 32, tracking: -0.25 },
  title2: { family: 'semibold', size: 20, line: 28, tracking: 0 },
  title3: { family: 'semibold', size: 17, line: 24, tracking: 0 },
  body: { family: 'regular', size: 16, line: 24, tracking: 0 },
  bodySmall: { family: 'regular', size: 14, line: 20, tracking: 0 },
  label: { family: 'semibold', size: 15, line: 20, tracking: 0.1 },
  caption: { family: 'medium', size: 12, line: 16, tracking: 0.2 },
  overline: { family: 'semibold', size: 11, line: 16, tracking: 0.8 },
} as const;
export type TextVariant = keyof typeof typeScale;

// Shadows. Used ONLY on floating layers: bottom sheet, toast, sticky booking bar. Cards and lists use tone and borders.
// In dark theme, depth comes from surface tone, so the shadow is lighter.
export const shadows = {
  none: { shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  sm: { shadowOpacity: 0.12, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md: { shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  lg: { shadowOpacity: 0.24, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
} as const;
export type ShadowLevel = keyof typeof shadows;

// Motion.
export const motion = {
  duration: { fast: 120, base: 200, slow: 320, celebrate: 700 },
  easing: { standard: [0.2, 0, 0, 1], emphasized: [0.3, 0, 0, 1], exit: [0.4, 0, 1, 1] },
  spring: { damping: 18, stiffness: 220, mass: 0.8 },
} as const;

// Sizes.
export const size = { minTarget: 44, iconSm: 16, icon: 24, seat: 28, seatGap: 4, tabBar: 64, poster: { w: 2, h: 3 } } as const;

// Seat colors are built from roles in the theme. See src/ui/seatmap/seatStyles.ts.
