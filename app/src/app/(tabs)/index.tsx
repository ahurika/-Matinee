import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNowPlayingMovies, useUpcomingMovies, type MovieListItem } from '@/features/movies/queries';
import { Chip } from '@/ui/components/Chip';
import { EmptyState } from '@/ui/components/EmptyState';
import { Poster } from '@/ui/components/Poster';
import { Skeleton } from '@/ui/components/Skeleton';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/theme';
import { motion, radius, size, space } from '@/ui/tokens';

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = 'now' | 'soon';

// Genre id → name (TMDB standard subset)
const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
};

// Deterministic mock showtimes (real showtimes would come from showtimes API)
const MOCK_TIMES = ['10:00', '13:30', '16:45', '19:15', '21:50'];
function showtimesFor(id: number) {
  const count = 2 + (id % 3);
  return MOCK_TIMES.slice(0, count);
}

// ─── Day selector data ────────────────────────────────────────────────────────
function buildDays() {
  const days: { label: string; sub: string; iso: string }[] = [];
  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const label = i === 0 ? 'TODAY' : i === 1 ? 'TOMORROW' : DAYS[d.getDay()];
    const sub = i <= 1 ? '' : `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    days.push({ label, sub, iso: d.toISOString().slice(0, 10) });
  }
  return days;
}

// ─── Animated pressable ───────────────────────────────────────────────────────
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ScalePressable({
  onPress,
  style,
  children,
  accessibilityLabel,
}: {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
  accessibilityLabel?: string;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => scale.set(withTiming(0.97, { duration: motion.duration.fast }))}
      onPressOut={() => scale.set(withTiming(1, { duration: motion.duration.fast }))}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={[anim, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ─── Movie row ────────────────────────────────────────────────────────────────
function MovieRow({
  movie,
  selectedDay,
}: {
  movie: MovieListItem;
  selectedDay: string;
}) {
  const { colors } = useTheme();
  const POSTER_W = 96;
  const POSTER_H = Math.round(POSTER_W * 1.5);
  const genres = (movie.genre_ids ?? [])
    .slice(0, 2)
    .map((id) => GENRE_MAP[id])
    .filter(Boolean);
  const times = showtimesFor(movie.id);
  const year = movie.release_date?.slice(0, 4) ?? '';

  return (
    <ScalePressable
      onPress={() => router.push(`/movie/${movie.id}`)}
      accessibilityLabel={`${movie.title}, rated ${movie.vote_average.toFixed(1)}`}
      style={[styles.row, { borderBottomColor: colors.outlineVariant }]}
    >
      {/* Poster thumbnail */}
      <View style={[styles.posterWrap, { width: POSTER_W, height: POSTER_H, backgroundColor: colors.surfaceContainerLow }]}>
        <Poster uri={movie.poster_path} title={movie.title} width={POSTER_W} radius="sm" />
      </View>

      {/* Content */}
      <View style={styles.rowContent}>
        <View style={styles.titleRow}>
          <Text variant="title3" color="onSurface" numberOfLines={2} style={styles.title}>
            {movie.title.toUpperCase()}
          </Text>
          {year ? (
            <Text variant="caption" color="onSurfaceVariant" style={styles.year}>
              {year}
            </Text>
          ) : null}
        </View>

        {movie.overview ? (
          <Text variant="bodySmall" color="onSurfaceVariant" numberOfLines={2} style={styles.overview}>
            {movie.overview}
          </Text>
        ) : null}

        {/* Showtime pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.timesScroll}
          contentContainerStyle={styles.timesContent}
        >
          {times.map((t) => (
            <Pressable
              key={`${movie.id}-${t}-${selectedDay}`}
              accessibilityRole="button"
              accessibilityLabel={`Showtime ${t}`}
              style={[
                styles.timePill,
                { borderColor: colors.primary, backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                {t}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Meta: rating + genres */}
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="star" size={12} color={colors.warning} />
          <Text variant="caption" color="onSurfaceVariant" style={{ marginLeft: 3, marginRight: space[3] }}>
            {movie.vote_average.toFixed(1)}
          </Text>
          {genres.map((g) => (
            <View
              key={g}
              style={[styles.genreChip, { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.outlineVariant }]}
            >
              <Text variant="overline" color="onSurfaceVariant">{g}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScalePressable>
  );
}

function MovieRowSkeleton() {
  return (
    <View style={[styles.row, { borderBottomColor: 'transparent' }]}>
      <Skeleton width={96} height={144} radius="sm" />
      <View style={[styles.rowContent, { gap: space[2] }]}>
        <Skeleton width="70%" height={16} radius="xs" />
        <Skeleton width="100%" height={13} radius="xs" />
        <Skeleton width="85%" height={13} radius="xs" />
        <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[1] }}>
          <Skeleton width={50} height={26} radius="xs" />
          <Skeleton width={50} height={26} radius="xs" />
          <Skeleton width={50} height={26} radius="xs" />
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<Tab>('now');
  const days = useMemo(() => buildDays(), []);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const selectedDay = days[selectedDayIdx]?.iso ?? days[0]!.iso;

  const {
    data: nowPlayingData,
    isLoading: loadingNow,
    refetch: refetchNow,
    isRefetching: refetchingNow,
    error: errorNow,
  } = useNowPlayingMovies();

  const {
    data: upcomingData,
    isLoading: loadingSoon,
    refetch: refetchSoon,
    error: errorSoon,
  } = useUpcomingMovies();

  const isStale = nowPlayingData?.stale || upcomingData?.stale;
  const isNow = activeTab === 'now';
  const movies = isNow ? nowPlayingData?.movies : upcomingData?.movies;
  const isLoading = isNow ? loadingNow : loadingSoon;
  const error = isNow ? errorNow : errorSoon;
  const refetch = isNow ? refetchNow : refetchSoon;

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchNow(), refetchSoon()]);
  }, [refetchNow, refetchSoon]);

  const renderTab = (tab: Tab, label: string) => {
    const active = activeTab === tab;
    return (
      <Pressable
        key={tab}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
        onPress={() => setActiveTab(tab)}
        style={[
          styles.tabPill,
          {
            backgroundColor: active ? colors.primary : colors.surfaceContainerHigh,
            borderColor: active ? colors.primary : colors.outlineVariant,
          },
        ]}
      >
        <Text variant="label" style={{ color: active ? colors.onPrimary : colors.onSurfaceVariant }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const renderDay = (day: { label: string; sub: string }, idx: number) => {
    const active = idx === selectedDayIdx;
    return (
      <Pressable
        key={idx}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${day.label}${day.sub ? ` ${day.sub}` : ''}`}
        onPress={() => setSelectedDayIdx(idx)}
        style={[
          styles.dayBtn,
          {
            backgroundColor: active ? colors.primaryContainer : 'transparent',
            borderBottomColor: active ? colors.primary : 'transparent',
            borderBottomWidth: 2,
          },
        ]}
      >
        <Text
          variant="caption"
          style={{
            color: active ? colors.primary : colors.onSurfaceVariant,
            fontWeight: active ? '700' : '500',
            textAlign: 'center',
          }}
        >
          {day.label}
        </Text>
        {day.sub ? (
          <Text
            variant="overline"
            style={{ color: active ? colors.primary : colors.onSurfaceVariant, textAlign: 'center' }}
          >
            {day.sub}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + space[3],
        paddingBottom: insets.bottom + space[8],
      }}
      refreshControl={
        <RefreshControl
          refreshing={refetchingNow}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text variant="title1" color="primary">Matinee</Text>
          <Text variant="overline" color="onSurfaceVariant">CINEMA TICKET BOOKING</Text>
        </View>
        <View style={styles.headerRight}>
          {isStale ? <Chip label="Cached" tone="warning" /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search movies"
            onPress={() => router.push('/search' as any)}
            style={[styles.searchBtn, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant }]}
          >
            <MaterialCommunityIcons name="magnify" size={size.icon} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      </View>

      {/* ── Category tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
        style={{ marginBottom: space[4] }}
      >
        {renderTab('now', 'NOW SHOWING')}
        {renderTab('soon', 'COMING SOON')}
      </ScrollView>

      {/* ── Day selector (only for now showing) ── */}
      {isNow ? (
        <View style={[styles.dayBar, { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLow }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayScroll}>
            {days.map((d, i) => renderDay(d, i))}
          </ScrollView>
        </View>
      ) : null}

      {/* ── Movie list ── */}
      <View style={{ marginTop: space[3] }}>
        {isLoading ? (
          <>
            <MovieRowSkeleton />
            <MovieRowSkeleton />
            <MovieRowSkeleton />
          </>
        ) : error ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Could Not Load Movies"
            message="We're having trouble reaching the server. Check your connection and try again."
            actionLabel="Try Again"
            onAction={() => void refetch()}
          />
        ) : !movies?.length ? (
          <EmptyState
            icon="movie-outline"
            title="Nothing Here"
            message={isNow ? 'No films currently showing.' : 'No upcoming films.'}
          />
        ) : (
          movies.map((movie) => (
            <MovieRow key={movie.id} movie={movie} selectedDay={selectedDay} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[4],
    marginBottom: space[4],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    paddingHorizontal: space[4],
    gap: space[2],
    flexDirection: 'row',
  },
  tabPill: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dayBar: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  dayScroll: {
    paddingHorizontal: space[4],
    flexDirection: 'row',
  },
  dayBtn: {
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    alignItems: 'center',
    minWidth: 64,
  },
  row: {
    flexDirection: 'row',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  posterWrap: {
    borderRadius: radius.sm,
    overflow: 'hidden',
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[2],
  },
  title: {
    flex: 1,
    letterSpacing: 0.3,
  },
  year: {
    marginTop: 2,
    flexShrink: 0,
  },
  overview: {
    marginTop: space[1],
    marginBottom: space[2],
  },
  timesScroll: {
    flexGrow: 0,
    marginBottom: space[2],
  },
  timesContent: {
    gap: space[2],
    flexDirection: 'row',
  },
  timePill: {
    paddingHorizontal: space[3],
    paddingVertical: 5,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space[1],
  },
  genreChip: {
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
});
