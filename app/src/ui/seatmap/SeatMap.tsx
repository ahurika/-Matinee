import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '../components/Text';
import { useTheme } from '../theme';
import { motion, radius, size } from '../tokens';
import { LABELS, paletteFor, visualFor } from './seatStyles';
import type { Seat } from './types';

const CELL = size.seat + size.seatGap;

type Props = {
  seats: Seat[];
  selectedIds: ReadonlySet<string>;
  maxSelectable?: number; // for example 8 tickets per order
  onToggle: (seat: Seat, nextSelected: boolean) => void;
  onLimitReached?: () => void;
  availableWidth: number; // width of the container, used for the fit-to-width start zoom
  height?: number;
};

// A single seat. Wrapped in memo, so tapping one seat re-renders only that seat (not all 300+).
const SeatButton = memo(function SeatButton({ seat, selected, onPress }: { seat: Seat; selected: boolean; onPress: (s: Seat) => void }) {
  const { colors } = useTheme();
  const visual = visualFor(seat, selected);
  const p = paletteFor(visual, colors);
  const pop = useSharedValue(1);

  useEffect(() => {
    // A small springy pop when the selection changes. Tap feedback, not decoration.
    pop.value = 0.85;
    pop.value = withSpring(1, motion.spring);
  }, [selected, pop]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const disabled = seat.status !== 'available';
  return (
    <Pressable
      onPress={() => onPress(seat)}
      disabled={disabled}
      hitSlop={size.seatGap + 2}
      accessibilityRole="button"
      accessibilityLabel={`Row ${seat.row}, seat ${seat.number}, ${LABELS[visual]}`}
      accessibilityState={{ selected, disabled }}
      style={{ left: seat.col * CELL, top: (seat.row.charCodeAt(0) - 65) * CELL, position: 'absolute' }}>
      <Animated.View
        style={[
          styles.seat,
          { backgroundColor: p.bg, borderColor: p.border, borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm, borderBottomLeftRadius: radius.xs, borderBottomRightRadius: radius.xs },
          animated,
        ]}>
        {p.icon ? <MaterialCommunityIcons name={p.icon as 'check'} size={16} color={p.fg} /> : null}
      </Animated.View>
    </Pressable>
  );
});

export function SeatMap({ seats, selectedIds, maxSelectable = 8, onToggle, onLimitReached, availableWidth, height = 420 }: Props) {
  const { colors } = useTheme();
  const rows = useMemo(() => new Set(seats.map((s) => s.row)).size, [seats]);
  const cols = useMemo(() => Math.max(...seats.map((s) => s.col)) + 1, [seats]);
  const contentW = cols * CELL;
  const contentH = rows * CELL;

  const fit = Math.min(1, (availableWidth - 32) / contentW);
  const scale = useSharedValue(fit);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedScale = useSharedValue(fit);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => { void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion); }, []);

  const clampT = (t: number, content: number, container: number, s: number) => {
    'worklet';
    const max = Math.max(0, (content * s - container) / 2);
    return Math.min(max, Math.max(-max, t));
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => { scale.value = Math.min(2.5, Math.max(fit, savedScale.value * e.scale)); })
    .onEnd(() => {
      savedScale.value = scale.value;
      tx.value = clampT(tx.value, contentW, availableWidth, scale.value);
      ty.value = clampT(ty.value, contentH, height, scale.value);
    });
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = clampT(savedTx.value + e.translationX, contentW, availableWidth, scale.value);
      ty.value = clampT(savedTy.value + e.translationY, contentH, height, scale.value);
    })
    .onEnd(() => { savedTx.value = tx.value; savedTy.value = ty.value; });
  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    const target = scale.value > fit + 0.05 ? fit : 1.4;
    scale.value = reduceMotion ? target : withSpring(target, motion.spring);
    savedScale.value = target;
    tx.value = 0; ty.value = 0; savedTx.value = 0; savedTy.value = 0;
  });
  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const handlePress = useCallback(
    (seat: Seat) => {
      const next = !selectedIds.has(seat.id);
      if (next && selectedIds.size >= maxSelectable) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        onLimitReached?.();
        return;
      }
      void Haptics.selectionAsync().catch(() => {});
      onToggle(seat, next);
    },
    [selectedIds, maxSelectable, onToggle, onLimitReached],
  );

  return (
    <View style={{ width: availableWidth, height, overflow: 'hidden', backgroundColor: colors.surface }} accessibilityLabel={`Seat map, ${seats.length} seats`}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ width: contentW, height: contentH, alignSelf: 'center', marginTop: 24 }, animatedStyle]}>
          {seats.map((s) => (
            <SeatButton key={s.id} seat={s} selected={selectedIds.has(s.id)} onPress={handlePress} />
          ))}
        </Animated.View>
      </GestureDetector>
      <Text variant="caption" color="onSurfaceVariant" align="center" style={styles.hint}>
        Pinch to zoom. Double tap to zoom in or out.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  seat: { width: size.seat, height: size.seat, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', bottom: 8, left: 0, right: 0 },
});
