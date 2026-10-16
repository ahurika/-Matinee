import { useEffect } from 'react';
import { AccessibilityInfo, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { useTheme } from '../theme';
import { radius as r } from '../tokens';

type Props = { width?: DimensionValue; height?: DimensionValue; radius?: keyof typeof r; style?: ViewStyle };

// Placeholder block that matches the final layout. A soft opacity pulse, no gradient shimmer.
// Hidden from screen readers. The screen announces loading state itself.
export function Skeleton({ width = '100%', height = 16, radius = 'sm', style }: Props) {
  const { colors } = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      opacity.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 700, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })),
        -1,
      );
    });
    return () => { cancelled = true; };
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: r[radius], backgroundColor: colors.surfaceContainerHigh }, style, animated]}
    />
  );
}
