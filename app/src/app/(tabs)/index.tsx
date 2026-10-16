import { router } from 'expo-router';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNowPlayingMovies, useUpcomingMovies } from '@/features/movies/queries';
import { Chip } from '@/ui/components/Chip';
import { EmptyState } from '@/ui/components/EmptyState';
import { MovieCard, MovieCardSkeleton } from '@/ui/components/MovieCard';
import { Poster } from '@/ui/components/Poster';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/theme';
import { radius, space } from '@/ui/tokens';

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const {
    data: nowPlayingData,
    isLoading: loadingNowPlaying,
    refetch: refetchNowPlaying,
    isRefetching: refetchingNowPlaying,
    error: errorNowPlaying,
  } = useNowPlayingMovies();

  const {
    data: upcomingData,
    isLoading: loadingUpcoming,
    refetch: refetchUpcoming,
  } = useUpcomingMovies();

  const isStale = nowPlayingData?.stale || upcomingData?.stale;

  const cardWidth = Math.floor((width - space[4] * 2 - space[3]) / 2);
  const featuredMovie = nowPlayingData?.movies?.[0];

  const handleRefresh = async () => {
    await Promise.all([refetchNowPlaying(), refetchUpcoming()]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + space[3],
        paddingBottom: space[8],
      }}
      refreshControl={
        <RefreshControl
          refreshing={refetchingNowPlaying}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="display" color="primary">
            Matinee
          </Text>
          <Text variant="bodySmall" color="onSurfaceVariant">
            Book cinema seats instantly
          </Text>
        </View>

        {isStale ? (
          <Chip label="Saved details" tone="warning" />
        ) : null}
      </View>

      {/* Hero Banner (Poster is hero, solid scrim 55% black, no gradients) */}
      {featuredMovie ? (
        <View style={styles.heroContainer}>
          <View style={[styles.heroCard, { backgroundColor: colors.surfaceContainerLow }]}>
            <Poster
              uri={featuredMovie.poster_path}
              title={featuredMovie.title}
              width={width - space[4] * 2}
              radius="lg"
            />
            {/* Solid flat scrim overlay at 55% */}
            <View style={styles.heroScrim} />
            <View style={styles.heroOverlayContent}>
              <Chip label="Now Featured" tone="neutral" />
              <Text variant="title1" style={{ color: '#FFFFFF', marginTop: space[2] }}>
                {featuredMovie.title}
              </Text>
              <Text
                variant="bodySmall"
                numberOfLines={2}
                style={{ color: '#D8C2BA', marginTop: space[1], marginBottom: space[3] }}
              >
                {featuredMovie.overview}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Now Showing Section */}
      <View style={styles.sectionHeader}>
        <Text variant="title2" color="onSurface">
          Now Showing
        </Text>
        <Text variant="caption" color="onSurfaceVariant">
          {nowPlayingData?.movies?.length ?? 0} films
        </Text>
      </View>

      {loadingNowPlaying ? (
        <View style={styles.gridContainer}>
          {Array.from({ length: 4 }).map((_, i) => (
            <MovieCardSkeleton key={i} width={cardWidth} />
          ))}
        </View>
      ) : errorNowPlaying ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could Not Load Movies"
          message="We are having trouble contacting the film server. Check your connection."
          actionLabel="Try Again"
          onAction={() => refetchNowPlaying()}
        />
      ) : (
        <View style={styles.gridContainer}>
          {nowPlayingData?.movies?.map((movie) => (
            <MovieCard
              key={movie.id}
              width={cardWidth}
              movie={{
                id: movie.id,
                title: movie.title,
                posterUrl: movie.poster_path,
                rating: movie.vote_average,
              }}
              onPress={() => router.push(`/movie/${movie.id}`)}
            />
          ))}
        </View>
      )}

      {/* Coming Soon Carousel */}
      <View style={[styles.sectionHeader, { marginTop: space[6] }]}>
        <Text variant="title2" color="onSurface">
          Coming Soon
        </Text>
      </View>

      {loadingUpcoming ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {Array.from({ length: 3 }).map((_, i) => (
            <MovieCardSkeleton key={i} width={130} style={{ marginRight: space[3] }} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={upcomingData?.movies}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => (
            <MovieCard
              width={130}
              movie={{
                id: item.id,
                title: item.title,
                posterUrl: item.poster_path,
                rating: item.vote_average,
              }}
              comingSoonDate={item.release_date}
              onPress={() => router.push(`/movie/${item.id}`)}
              style={{ marginRight: space[3] }}
            />
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[4],
    marginBottom: space[4],
  },
  heroContainer: {
    paddingHorizontal: space[4],
    marginBottom: space[6],
  },
  heroCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  heroOverlayContent: {
    position: 'absolute',
    bottom: space[4],
    left: space[4],
    right: space[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: space[4],
    marginBottom: space[3],
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: space[4],
    gap: space[3],
  },
  horizontalList: {
    paddingHorizontal: space[4],
  },
});
