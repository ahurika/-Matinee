import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { radius, space } from '../tokens';
import { Text } from './Text';

export type BadgeTone = 'primary' | 'error';

export type BadgeProps = {
  count?: number;
  dot?: boolean;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
};

export function Badge({ count, dot = false, tone = 'primary', style }: BadgeProps) {
  const { colors } = useTheme();

  const bg = tone === 'primary' ? colors.primary : colors.error;
  const fg = tone === 'primary' ? colors.onPrimary : colors.onError;

  if (dot) {
    return (
      <View
        accessible
        accessibilityRole="none"
        accessibilityLabel="Notification indicator"
        style={[styles.dot, { backgroundColor: bg }, style]}
      />
    );
  }

  if (count === undefined || count <= 0) return null;

  const displayCount = count > 9 ? '9+' : count.toString();

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${displayCount} unread items`}
      style={[styles.badge, { backgroundColor: bg }, style]}
    >
      <Text variant="caption" style={[styles.text, { color: fg }]}>
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    paddingHorizontal: space[1],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
