import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme';
import { motion, radius, space } from '../tokens';
import { Text } from './Text';

export type ToastTone = 'neutral' | 'info' | 'warning' | 'error' | 'success';

export type ToastOptions = {
  message: string;
  tone?: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

type ToastContextValue = {
  show: (options: ToastOptions) => void;
  hide: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastOptions | null>(null);
  const queueRef = useRef<ToastOptions[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const processNext = useCallback(() => {
    if (queueRef.current.length > 0) {
      const next = queueRef.current.shift()!;
      setCurrent(next);
    } else {
      setCurrent(null);
    }
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrent(null);
    setTimeout(processNext, 200);
  }, [processNext]);

  const show = useCallback(
    (options: ToastOptions) => {
      // Trigger appropriate haptic
      if (options.tone === 'error') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } else if (options.tone === 'success') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else if (options.tone === 'warning') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }

      if (current) {
        queueRef.current.push(options);
      } else {
        setCurrent(options);
      }
    },
    [current],
  );

  useEffect(() => {
    if (current) {
      const duration = current.durationMs ?? 4000;
      timerRef.current = setTimeout(() => {
        hide();
      }, duration);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [current, hide]);

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      {current ? <ToastItem toast={current} onDismiss={hide} /> : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

function ToastItem({ toast, onDismiss }: { toast: ToastOptions; onDismiss: () => void }) {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);

  useEffect(() => {
    translateY.value = withSpring(0, motion.spring);
  }, [translateY]);

  const dismiss = useCallback(() => {
    translateY.value = withTiming(-120, { duration: motion.duration.fast }, () => {
      runOnJS(onDismiss)();
    });
  }, [translateY, onDismiss]);

  const panGesture = Gesture.Pan().onEnd((event) => {
    if (event.translationY < -15 || event.velocityY < -300) {
      runOnJS(dismiss)();
    }
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const getPalette = () => {
    switch (toast.tone) {
      case 'error':
        return {
          bg: colors.errorContainer,
          fg: colors.onErrorContainer,
          icon: 'alert-circle-outline' as const,
        };
      case 'success':
        return {
          bg: colors.successContainer,
          fg: colors.onSuccessContainer,
          icon: 'check-circle-outline' as const,
        };
      case 'warning':
        return {
          bg: colors.warningContainer,
          fg: colors.onWarningContainer,
          icon: 'alert-outline' as const,
        };
      case 'info':
        return {
          bg: colors.infoContainer,
          fg: colors.onInfoContainer,
          icon: 'information-outline' as const,
        };
      case 'neutral':
      default:
        return {
          bg: colors.surfaceContainerHigh,
          fg: colors.onSurface,
          icon: 'bell-outline' as const,
        };
    }
  };

  const p = getPalette();
  const isAssertive = toast.tone === 'error';

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion={isAssertive ? 'assertive' : 'polite'}
        accessibilityLabel={toast.message}
        style={[
          styles.toastContainer,
          {
            top: insets.top + space[2],
            backgroundColor: p.bg,
          },
          shadow('md'),
          animatedStyle,
        ]}
      >
        <MaterialCommunityIcons name={p.icon} size={20} color={p.fg} style={styles.icon} />

        <Text variant="bodySmall" style={[styles.message, { color: p.fg }]}>
          {toast.message}
        </Text>

        {toast.actionLabel && toast.onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={toast.actionLabel}
            onPress={() => {
              toast.onAction?.();
              dismiss();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionButton}
          >
            <Text variant="label" style={{ color: p.fg, textDecorationLine: 'underline' }}>
              {toast.actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
  },
  icon: {
    marginRight: space[3],
  },
  message: {
    flex: 1,
    lineHeight: 18,
  },
  actionButton: {
    marginLeft: space[3],
  },
});
