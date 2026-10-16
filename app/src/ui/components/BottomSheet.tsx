import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme';
import { motion, radius, space } from '../tokens';
import { Text } from './Text';

export type BottomSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  children: ReactNode;
  snapPoints?: number[]; // fractions, e.g. [0.5, 0.8]
};

export function BottomSheet({
  visible,
  onDismiss,
  title,
  children,
}: BottomSheetProps) {
  const { colors, shadow } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);

  // Sheet translateY: 0 means fully open, screenHeight means closed
  const translateY = useSharedValue(screenHeight);
  const contextY = useSharedValue(0);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (visible) {
      if (reduceMotion) {
        translateY.value = 0;
      } else {
        translateY.value = withTiming(0, {
          duration: motion.duration.slow,
        });
      }
    } else {
      if (reduceMotion) {
        translateY.value = screenHeight;
      } else {
        translateY.value = withTiming(screenHeight, {
          duration: motion.duration.slow,
        });
      }
    }
  }, [visible, screenHeight, reduceMotion, translateY]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      // Only allow dragging down past 0 (resist dragging up above sheet)
      const nextY = contextY.value + event.translationY;
      translateY.value = Math.max(0, nextY);
    })
    .onEnd((event) => {
      if (event.velocityY > 600 || translateY.value > 150) {
        // Dismiss
        translateY.value = withTiming(screenHeight, { duration: motion.duration.base }, () => {
          runOnJS(onDismiss)();
        });
      } else {
        // Snap back to top
        translateY.value = withTiming(0, { duration: motion.duration.base });
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateY.value, [0, screenHeight], [0.55, 0]);
    return { opacity };
  });

  if (!visible && translateY.value >= screenHeight) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View
        accessible
        accessibilityViewIsModal
        style={styles.container}
      >
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss sheet"
            onPress={onDismiss}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surfaceContainer,
                maxHeight: screenHeight * 0.88,
              },
              shadow('lg'),
              animatedSheetStyle,
            ]}
          >
            <View style={styles.handleContainer}>
              <View style={[styles.dragHandle, { backgroundColor: colors.outline }]} />
            </View>

            {title ? (
              <View style={styles.header}>
                <Text variant="title2" color="onSurface">
                  {title}
                </Text>
              </View>
            ) : null}

            <View style={styles.content}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: space[2],
  },
  dragHandle: {
    width: 32,
    height: 4,
    borderRadius: radius.pill,
  },
  header: {
    paddingHorizontal: space[4],
    paddingBottom: space[2],
  },
  content: {
    paddingHorizontal: space[4],
    paddingBottom: space[8],
  },
});
