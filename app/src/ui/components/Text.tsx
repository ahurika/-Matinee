import { Text as RNText, type TextProps } from 'react-native';

import { useTheme } from '../theme';
import { fontFamily, typeScale, type ColorRole, type TextVariant } from '../tokens';

type Props = TextProps & { variant?: TextVariant; color?: ColorRole; align?: 'left' | 'center' | 'right' };

// All text in the app goes through this component, so the type scale is enforced in one place.
// Text scales with the system font size. Cap very large sizes only where a layout would break.
export function Text({ variant = 'body', color = 'onSurface', align, style, maxFontSizeMultiplier = 2, ...rest }: Props) {
  const { colors } = useTheme();
  const t = typeScale[variant];
  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        {
          fontFamily: fontFamily[t.family],
          fontSize: t.size,
          lineHeight: t.line,
          letterSpacing: t.tracking,
          color: colors[color],
          textAlign: align,
        },
        variant === 'overline' && { textTransform: 'uppercase' },
        style,
      ]}
    />
  );
}
