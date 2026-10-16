import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '../theme';
import { motion, space } from '../tokens';
import { Text } from './Text';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const CHECKMARK_PATH = 'M14 27 L22 35 L36 17';
const PATH_LENGTH = 35;

export function ConfirmationCelebration({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);

  const circleScale = useSharedValue(0);
  const strokeOffset = useSharedValue(PATH_LENGTH);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(8);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    // Trigger success haptic
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (reduceMotion) {
      circleScale.value = 1;
      strokeOffset.value = 0;
      textOpacity.value = 1;
      textTranslateY.value = 0;
      return;
    }

    // 1. Circle scale spring (0ms)
    circleScale.value = withSpring(1, motion.spring);

    // 2. Checkmark draw animation (starts at 150ms)
    strokeOffset.value = withDelay(
      150,
      withTiming(0, { duration: motion.duration.slow }),
    );

    // 3. Text fade up 8 dp (starts at 300ms)
    textOpacity.value = withDelay(300, withTiming(1, { duration: motion.duration.base }));
    textTranslateY.value = withDelay(300, withTiming(0, { duration: motion.duration.base }));
  }, [reduceMotion, circleScale, strokeOffset, textOpacity, textTranslateY]);

  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const animatedPathProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeOffset.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.svgWrapper, circleAnimatedStyle]}>
        <Svg width={52} height={52} viewBox="0 0 52 52">
          <Circle
            cx={26}
            cy={26}
            r={24}
            fill={colors.successContainer}
            stroke="none"
          />
          <AnimatedPath
            d={CHECKMARK_PATH}
            fill="none"
            stroke={colors.onSuccessContainer}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={PATH_LENGTH}
            animatedProps={animatedPathProps}
          />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.textWrapper, textAnimatedStyle]}>
        <Text variant="title1" color="onSurface" style={styles.title}>
          {title}
        </Text>
        <Text variant="bodySmall" color="onSurfaceVariant" style={styles.subtitle}>
          {subtitle}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space[4],
  },
  svgWrapper: {
    width: 52,
    height: 52,
    marginBottom: space[4],
  },
  textWrapper: {
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: space[2],
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
});
