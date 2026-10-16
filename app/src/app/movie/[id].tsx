import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMovieDetail } from '@/features/movies/queries';
import { Button } from '@/ui/components/Button';
import { Chip } from '@/ui/components/Chip';
import { EmptyState } from '@/ui/components/EmptyState';
import { Poster } from '@/ui/components/Poster';
import { Skeleton } from '@/ui/components/Skeleton';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/theme';
import { radius, space } from '@/ui/tokens';

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { data, isLoading, error } = useMovieDetail(id);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Skeleton width="100%" height={240} radius="xs" />
        <View style={{ padding: space[4], gap: space[3] }}>
          <Skeleton width="80%" height={28} radius="xs" />
          <Skeleton width="40%" height={16} radius="xs" />
          <Skeleton width="100%" height={80} radius="sm" />
        </View>
      </View>
    );
  }

  if (error || !data?.movie) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <EmptyState
          icon="alert-circle-outline"
          title="Movie Details Unavailable"
          message="Could not load the requested film details."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const { movie, stale } = data;
  const hours = Math.floor((movie.runtime || 0) / 60);
  const minutes = (movie.runtime || 0) % 60;
  const formattedRuntime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Backdrop Header */}
        <View style={styles.backdropContainer}>
          <Poster
            uri={movie.backdrop_path || movie.poster_path}
            width={width}
            title={movie.title}
            radius="xs"
          />
          <View style={styles.backdropScrim} />

          {/* Top back button */}
          <View style={[styles.topBar, { top: insets.top + space[2] }]}>
            <Button
              label="Back"
              variant="outline"
              size="md"
              leading={<MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />}
              onPress={() => router.back()}
            />

            {stale ? <Chip label="Saved details" tone="warning" /> : null}
          </View>

          {/* Poster & Title overlay */}
          <View style={styles.heroOverlay}>
            <Poster uri={movie.poster_path} width={100} title={movie.title} radius="md" />

            <View style={styles.heroText}>
              <Text variant="title1" style={{ color: '#FFFFFF' }}>
                {movie.title}
              </Text>

              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="star" size={16} color={colors.warning} />
                <Text variant="label" style={{ color: '#EDE0DC', marginLeft: 4, marginRight: 12 }}>
                  {movie.vote_average.toFixed(1)}
                </Text>

                {movie.runtime ? (
                  <Text variant="caption" style={{ color: '#D8C2BA' }}>
                    {formattedRuntime}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* Genres */}
        {movie.genres && movie.genres.length > 0 ? (
          <View style={styles.genreRow}>
            {movie.genres.map((g) => (
              <Chip key={g.id} label={g.name} tone="neutral" />
            ))}
          </View>
        ) : null}

        {/* Synopsis */}
        <View style={styles.section}>
          <Text variant="title2" color="onSurface" style={{ marginBottom: space[2] }}>
            Synopsis
          </Text>
          <Text variant="body" color="onSurfaceVariant" style={{ lineHeight: 24 }}>
            {movie.overview || 'No synopsis provided.'}
          </Text>
        </View>

        {/* Top Cast */}
        {movie.credits?.cast && movie.credits.cast.length > 0 ? (
          <View style={styles.section}>
            <Text variant="title2" color="onSurface" style={{ marginBottom: space[2] }}>
              Top Cast
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[3] }}>
              {movie.credits.cast.slice(0, 8).map((actor) => (
                <View key={actor.id} style={styles.actorCard}>
                  <Poster uri={actor.profile_path} width={70} title={actor.name} radius="sm" />
                  <Text variant="caption" color="onSurface" numberOfLines={1} style={{ marginTop: 4 }}>
                    {actor.name}
                  </Text>
                  <Text variant="caption" color="onSurfaceVariant" numberOfLines={1}>
                    {actor.character}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      {/* Floating Sticky Booking Bar */}
      <View
        style={[
          styles.stickyBookingBar,
          {
            backgroundColor: colors.surfaceContainer,
            borderTopColor: colors.outlineVariant,
            paddingBottom: insets.bottom + space[3],
          },
          shadow('lg'),
        ]}
      >
        <Button
          label="Book Tickets"
          size="lg"
          fullWidth
          onPress={() => router.push(`/showtimes/${movie.id}`)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropContainer: {
    position: 'relative',
    marginBottom: space[4],
  },
  backdropScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  topBar: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: space[4],
    left: space[4],
    right: space[4],
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[3],
  },
  heroText: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space[1],
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: space[4],
    gap: space[2],
    marginBottom: space[4],
  },
  section: {
    paddingHorizontal: space[4],
    marginBottom: space[4],
  },
  actorCard: {
    width: 70,
  },
  stickyBookingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: space[4],
    paddingTop: space[3],
  },
});
