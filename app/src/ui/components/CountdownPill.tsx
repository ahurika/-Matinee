import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { radius, space } from '../tokens';
import { Text } from './Text';

export type CountdownTone = 'normal' | 'warning' | 'expired';

export type CountdownPillProps = {
  label: string;
  tone?: CountdownTone;
  style?: StyleProp<ViewStyle>;
};

export function CountdownPill({ label, tone = 'normal', style }: CountdownPillProps) {
  const { colors } = useTheme();

  const getStyle = () => {
    switch (tone) {
      case 'warning':
        return {
          bg: colors.warningContainer,
          border: colors.warning,
          fg: colors.onWarningContainer,
          icon: 'timer-sand' as const,
        };
      case 'expired':
        return {
          bg: colors.errorContainer,
          border: colors.error,
          fg: colors.onErrorContainer,
          icon: 'timer-off-outline' as const,
        };
      case 'normal':
      default:
        return {
          bg: colors.surfaceContainerHigh,
          border: colors.outlineVariant,
          fg: colors.onSurface,
          icon: 'clock-outline' as const,
        };
    }
  };

  const s = getStyle();

  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Hold timer: ${label}`}
      style={[
        styles.pill,
        {
          backgroundColor: s.bg,
          borderColor: s.border,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons name={s.icon} size={14} color={s.fg} style={styles.icon} />
      <Text variant="caption" style={[styles.text, { color: s.fg }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 28,
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: space[1],
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
