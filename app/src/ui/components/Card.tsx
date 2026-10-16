import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '../theme';
import { motion, radius, space } from '../tokens';

export type CardVariant = 'filled' | 'outlined';

export type CardProps = {
  children: ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  children,
  variant = 'filled',
  onPress,
  accessibilityLabel,
  style,
  haptic = true,
}: CardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const containerStyle: ViewStyle = {
    borderRadius: radius.md,
    padding: space[4],
    backgroundColor: variant === 'filled' ? colors.surfaceContainerLow : colors.surface,
    borderWidth: variant === 'outlined' ? 1 : 0,
    borderColor: variant === 'outlined' ? colors.outlineVariant : 'transparent',
  };

  if (onPress) {
    return (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPressIn={() => {
          scale.set(withTiming(0.98, { duration: motion.duration.fast }));
        }}
        onPressOut={() => {
          scale.set(withTiming(1, { duration: motion.duration.fast }));
        }}
        onPress={(e) => {
          if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress();
        }}
        style={[styles.base, containerStyle, animated, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={[styles.base, containerStyle, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
