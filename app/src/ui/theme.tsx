import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme, type ViewStyle } from 'react-native';

import { darkColors, lightColors, shadows, type ColorScheme, type ShadowLevel } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';
type Theme = { isDark: boolean; colors: ColorScheme; shadow: (level: ShadowLevel) => ViewStyle };

const ThemeContext = createContext<Theme | null>(null);

// Dark is the primary theme for a cinema app, but both are designed. Mode comes from the saved setting.
export function ThemeProvider({ mode = 'system', children }: { mode?: ThemeMode; children: ReactNode }) {
  const system = useColorScheme();
  const isDark = mode === 'system' ? system !== 'light' : mode === 'dark';

  const theme = useMemo<Theme>(
    () => ({
      isDark,
      colors: isDark ? darkColors : lightColors,
      // On dark surfaces, tone does the work, so shadows are softened further.
      shadow: (level) => ({ shadowColor: '#000000', ...shadows[level], shadowOpacity: shadows[level].shadowOpacity * (isDark ? 0.6 : 1) }),
    }),
    [isDark],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('useTheme must be used inside ThemeProvider');
  return t;
}
