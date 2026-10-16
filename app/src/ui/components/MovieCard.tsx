import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '../theme';
import { motion, radius, space } from '../tokens';
import { Poster } from './Poster';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

export type MovieCardProps = {
  movie: {
    id: number | string;
    title: string;
    posterUrl?: string | null;
    rating?: number;
  };
  width: number;
  onPress: () => void;
  comingSoonDate?: string;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MovieCard({
  movie,
  width,
  onPress,
  comingSoonDate,
  style,
  haptic = true,
}: MovieCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const posterHeight = Math.round(width * 1.5);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${movie.title}${movie.rating ? `, rated ${movie.rating.toFixed(1)} out of 10` : ''}${comingSoonDate ? `, coming ${comingSoonDate}` : ''}`}
      onPressIn={() => {
        scale.set(withTiming(0.97, { duration: motion.duration.fast }));
      }}
      onPressOut={() => {
        scale.set(withTiming(1, { duration: motion.duration.fast }));
      }}
      onPress={() => {
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={[styles.container, { width }, animated, style]}
    >
      <View style={[styles.posterWrapper, { width, height: posterHeight }]}>
        <Poster uri={movie.posterUrl ?? null} width={width} title={movie.title} radius="md" />
      </View>

      <Text variant="title3" color="onSurface" numberOfLines={1} style={styles.title}>
        {movie.title}
      </Text>

      <View style={styles.metaRow}>
        {comingSoonDate ? (
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={14}
              color={colors.onSurfaceVariant}
              style={styles.metaIcon}
            />
            <Text variant="caption" color="onSurfaceVariant">
              {comingSoonDate}
            </Text>
          </View>
        ) : movie.rating ? (
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="star"
              size={14}
              color={colors.warning}
              style={styles.metaIcon}
            />
            <Text variant="caption" color="onSurfaceVariant">
              {movie.rating.toFixed(1)}
            </Text>
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

export function MovieCardSkeleton({ width, style }: { width: number; style?: StyleProp<ViewStyle> }) {
  const posterHeight = Math.round(width * 1.5);

  return (
    <View style={[styles.container, { width }, style]} accessible accessibilityLabel="Loading movie">
      <Skeleton width={width} height={posterHeight} radius="md" />
      <View style={{ marginTop: space[2], gap: space[1] }}>
        <Skeleton width="80%" height={18} radius="xs" />
        <Skeleton width="40%" height={14} radius="xs" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  posterWrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  title: {
    marginTop: space[2],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginRight: 4,
  },
});
