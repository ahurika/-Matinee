import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '../theme';
import { motion, radius, size, space } from '../tokens';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'outline' | 'text' | 'destructive';
type Size = 'md' | 'lg';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string; // also used as the accessibility label
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: boolean; // light tap feedback, on by default
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  variant = 'primary',
  size: s = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  haptic = true,
  leading,
  style,
  onPress,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const inactive = disabled || loading;

  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: 'transparent' },
    secondary: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer, border: 'transparent' },
    outline: { bg: 'transparent', fg: colors.primary, border: colors.outline },
    text: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    destructive: { bg: colors.errorContainer, fg: colors.onErrorContainer, border: 'transparent' },
  }[variant];

  return (
    <AnimatedPressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPressIn={() => { scale.set(withTiming(0.97, { duration: motion.duration.fast })); }}
      onPressOut={() => { scale.set(withTiming(1, { duration: motion.duration.fast })); }}
      onPress={(e) => {
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      style={[
        styles.base,
        {
          minHeight: s === 'lg' ? 52 : size.minTarget,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: variant === 'outline' ? 1 : 0,
          opacity: disabled ? 0.38 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        animated,
        style,
      ]}>
      <View style={styles.row}>
        {loading ? <ActivityIndicator size="small" color={palette.fg} /> : leading}
        <Text variant="label" style={{ color: palette.fg }}>
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, paddingHorizontal: space[6], justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
