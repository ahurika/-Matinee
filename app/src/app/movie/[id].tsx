import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMovieDetail, useNowPlayingMovies } from '@/features/movies/queries';
import { Button } from '@/ui/components/Button';
import { Chip } from '@/ui/components/Chip';
import { EmptyState } from '@/ui/components/EmptyState';
import { MovieCard } from '@/ui/components/MovieCard';
import { Skeleton } from '@/ui/components/Skeleton';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/theme';
import { radius, space } from '@/ui/tokens';

const DEMO_SHOWTIMES: Record<
  string,
  { id: string; time: string; cinema: string; screen: string; format: string; price: string }[]
> = {
  '693134': [
    {
      id: 'st-dune-sb1-today-1800',
      time: '18:00',
      cinema: 'Silverbird Cinemas',
      screen: 'Screen 1',
      format: 'Standard',
      price: '₦4,500',
    },
    {
      id: 'st-dune-sb1-today-2100',
      time: '21:00',
      cinema: 'Silverbird Cinemas',
      screen: 'Screen 1',
      format: 'Standard',
      price: '₦4,500',
    },
    {
      id: 'st-dune-fh1-tomorrow-1930',
      time: '19:30',
      cinema: 'Filmhouse IMAX',
      screen: 'IMAX 1',
      format: 'IMAX 2D',
      price: '₦5,000',
    },
  ],
  '533535': [
    {
      id: 'st-deadpool-sb2-today-1700',
      time: '17:00',
      cinema: 'Silverbird Cinemas',
      screen: 'Screen 2',
      format: 'VIP',
      price: '₦6,500',
    },
  ],
};

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { data, isLoading, error } = useMovieDetail(id);
  const { data: nowPlayingData } = useNowPlayingMovies();

  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);

  // Generate date tabs
  const days = [
    { label: 'Today, 17 Oct' },
    { label: 'Tomorrow, 18 Oct' },
    { label: 'Sun, 19 Oct' },
    { label: 'Mon, 20 Oct' },
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={{ padding: space[4], alignItems: 'center' }}>
          <Skeleton width="100%" height={380} radius="xl" />
          <View style={{ marginTop: space[4], width: '100%', gap: space[3], alignItems: 'center' }}>
            <Skeleton width="60%" height={28} radius="xs" />
            <Skeleton width="40%" height={16} radius="xs" />
            <Skeleton width="100%" height={48} radius="pill" />
          </View>
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

  const { movie } = data;
  const hours = Math.floor((movie.runtime || 0) / 60);
  const minutes = (movie.runtime || 0) % 60;
  const formattedRuntime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const genresList = movie.genres?.map((g) => g.name).join(' • ') || 'Feature Film';

  const showtimes =
    DEMO_SHOWTIMES[String(movie.id)] || [
      {
        id: 'st-dune-sb1-today-1800',
        time: '18:00',
        cinema: 'Silverbird Cinemas',
        screen: 'Screen 1',
        format: 'Standard',
        price: '₦4,500',
      },
    ];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${movie.title} on Matinee! Book your cinema seats now.`,
      });
    } catch {
      // User cancelled or share failed
    }
  };

  const moreMovies =
    nowPlayingData?.movies?.filter((m) => String(m.id) !== String(movie.id)).slice(0, 4) || [];

  const heroPosterWidth = width - space[4] * 2;
  const heroPosterHeight = Math.round(heroPosterWidth * 1.25);
  const cardWidth = Math.floor((width - space[4] * 2 - space[3]) / 2);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Floating Navigation Header */}
      <View style={[styles.floatingHeader, { top: insets.top + space[1] }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to movies"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.iconCircle,
            { backgroundColor: colors.surfaceContainerLow, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          onPress={() => setIsFavorite(!isFavorite)}
          style={({ pressed }) => [
            styles.iconCircle,
            { backgroundColor: colors.surfaceContainerLow, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialCommunityIcons
            name={isFavorite ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isFavorite ? colors.primary : colors.onSurface}
          />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + space[8],
          paddingBottom: space[10],
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Framed Poster Card */}
        <View style={styles.heroWrapper}>
          <View
            style={[
              styles.heroCard,
              {
                width: heroPosterWidth,
                height: heroPosterHeight,
                backgroundColor: colors.surfaceContainerLow,
              },
            ]}
          >
            <Image
              source={{ uri: movie.backdrop_path || movie.poster_path || undefined }}
              style={{ width: heroPosterWidth, height: heroPosterHeight }}
              contentFit="cover"
              transition={200}
              accessibilityLabel={`Poster for ${movie.title}`}
            />
            {/* Flat dark scrim over image */}
            <View style={styles.posterScrim} />

            {/* "Trailer ▶" pill button centered near bottom of image */}
            <View style={styles.trailerOverlay}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Watch Trailer"
                style={({ pressed }) => [
                  styles.trailerButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => {
                  // In real app opens trailer video modal or youtube link
                }}
              >
                <Text variant="label" style={{ color: colors.onPrimary, fontWeight: '700' }}>
                  Trailer
                </Text>
                <MaterialCommunityIcons
                  name="play"
                  size={16}
                  color={colors.onPrimary}
                  style={{ marginLeft: 4 }}
                />
              </Pressable>
            </View>
          </View>

          {/* 3 Action icons beneath the poster: Download, Favorite, Share */}
          <View style={styles.heroActionRow}>
            <Pressable
              style={styles.heroActionItem}
              onPress={() => router.push(`/showtimes/${movie.id}`)}
            >
              <MaterialCommunityIcons name="ticket-outline" size={20} color={colors.onSurface} />
              <Text variant="caption" color="onSurfaceVariant" style={{ marginTop: 4 }}>
                Showtimes
              </Text>
            </Pressable>

            <Pressable style={styles.heroActionItem} onPress={() => setIsFavorite(!isFavorite)}>
              <MaterialCommunityIcons
                name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={isFavorite ? colors.primary : colors.onSurface}
              />
              <Text variant="caption" color="onSurfaceVariant" style={{ marginTop: 4 }}>
                Favorite
              </Text>
            </Pressable>

            <Pressable style={styles.heroActionItem} onPress={handleShare}>
              <MaterialCommunityIcons name="share-variant-outline" size={20} color={colors.onSurface} />
              <Text variant="caption" color="onSurfaceVariant" style={{ marginTop: 4 }}>
                Share
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 2. Studio / Cinema Tag */}
        <View style={styles.brandRow}>
          <Text variant="caption" color="primary" style={{ fontWeight: '700', letterSpacing: 1.2 }}>
            ✦ MATINEE EXCLUSIVE PREMIERE
          </Text>
        </View>

        {/* 3. Centered Movie Title & Meta */}
        <View style={styles.titleSection}>
          <Text variant="title1" color="onSurface" style={{ textAlign: 'center', fontWeight: '800' }}>
            {movie.title}
          </Text>

          <Text variant="bodySmall" color="onSurfaceVariant" style={{ textAlign: 'center', marginTop: space[1] }}>
            {movie.release_date ? movie.release_date.slice(0, 4) : '2024'} • {formattedRuntime} • 16+ • {genresList}
          </Text>

          <View style={styles.ratingRow}>
            <Text variant="bodySmall" color="onSurfaceVariant" style={{ marginRight: space[2] }}>
              Rating on Matinee
            </Text>
            <View style={[styles.ratingPill, { backgroundColor: colors.primary }]}>
              <MaterialCommunityIcons name="star" size={13} color={colors.onPrimary} style={{ marginRight: 2 }} />
              <Text variant="caption" style={{ color: colors.onPrimary, fontWeight: '700' }}>
                {movie.vote_average.toFixed(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Primary CTA: "Book Tickets" */}
        <View style={styles.ctaContainer}>
          <Button
            label="Book Tickets"
            size="lg"
            fullWidth
            onPress={() => router.push(`/showtimes/${movie.id}`)}
          />
        </View>

        {/* 5. Synopsis Text */}
        <View style={styles.sectionContainer}>
          <Text variant="body" color="onSurfaceVariant" style={{ lineHeight: 22 }}>
            {movie.overview || 'Experience the thrilling cinematic journey on the largest screens.'}
          </Text>
        </View>

        {/* 6. Day / Date Selector Pills */}
        <View style={styles.sectionContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space[2] }}
          >
            {days.map((d, index) => {
              const active = selectedDay === index;
              return (
                <Pressable
                  key={index}
                  onPress={() => setSelectedDay(index)}
                  style={[
                    styles.dayPill,
                    {
                      backgroundColor: active ? colors.onSurface : colors.surfaceContainerHigh,
                    },
                  ]}
                >
                  <Text
                    variant="label"
                    style={{
                      color: active ? colors.surface : colors.onSurface,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 7. Showtimes Cards (Horizontal scroll) */}
        <View style={styles.sectionContainer}>
          <Text variant="title3" color="onSurface" style={{ marginBottom: space[2] }}>
            Available Showtimes
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space[3], paddingRight: space[4] }}
          >
            {showtimes.map((st) => (
              <Pressable
                key={st.id}
                onPress={() => router.push(`/seats/${st.id}`)}
                style={({ pressed }) => [
                  styles.showtimeCard,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    borderColor: colors.outlineVariant,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.showtimeTop}>
                  <Text variant="title2" color="primary" style={{ fontWeight: '800' }}>
                    {st.time}
                  </Text>
                  <Chip label={st.format} tone="neutral" />
                </View>

                <Text variant="bodySmall" color="onSurface" numberOfLines={1} style={{ marginTop: space[1] }}>
                  {st.cinema}
                </Text>
                <Text variant="caption" color="onSurfaceVariant" numberOfLines={1}>
                  {st.screen}
                </Text>

                <View style={styles.showtimeBottom}>
                  <Text variant="label" color="onSurface">
                    {st.price}
                  </Text>
                  <Text variant="caption" color="primary" style={{ fontWeight: '700' }}>
                    Select Seats ›
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* 8. Specifications / Details Grid */}
        <View style={styles.sectionContainer}>
          <View style={[styles.specsCard, { backgroundColor: colors.surfaceContainerLow }]}>
            <View style={styles.specRow}>
              <Text variant="bodySmall" color="onSurfaceVariant" style={styles.specKey}>
                Language
              </Text>
              <Text variant="bodySmall" color="onSurface" style={styles.specValue}>
                English, French (Audio)
              </Text>
            </View>

            <View style={[styles.specDivider, { backgroundColor: colors.outlineVariant }]} />

            <View style={styles.specRow}>
              <Text variant="bodySmall" color="onSurfaceVariant" style={styles.specKey}>
                Subtitles
              </Text>
              <Text variant="bodySmall" color="onSurface" style={styles.specValue}>
                English (SDH)
              </Text>
            </View>

            <View style={[styles.specDivider, { backgroundColor: colors.outlineVariant }]} />

            <View style={styles.specRow}>
              <Text variant="bodySmall" color="onSurfaceVariant" style={styles.specKey}>
                Format
              </Text>
              <Text variant="bodySmall" color="onSurface" style={styles.specValue}>
                IMAX 2D, Dolby Atmos 5.1
              </Text>
            </View>

            <View style={[styles.specDivider, { backgroundColor: colors.outlineVariant }]} />

            <View style={styles.specRow}>
              <Text variant="bodySmall" color="onSurfaceVariant" style={styles.specKey}>
                Certification
              </Text>
              <Text variant="bodySmall" color="onSurface" style={styles.specValue}>
                16+ (Mature Sci-Fi Themes)
              </Text>
            </View>
          </View>
        </View>

        {/* 9. Top Cast (Circular avatars with names underneath) */}
        {movie.credits?.cast && movie.credits.cast.length > 0 ? (
          <View style={styles.sectionContainer}>
            <Text variant="title3" color="onSurface" style={{ marginBottom: space[3] }}>
              Cast
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: space[4], paddingRight: space[4] }}
            >
              {movie.credits.cast.slice(0, 8).map((actor) => (
                <View key={actor.id} style={styles.castItem}>
                  <View
                    style={[
                      styles.avatarWrapper,
                      { backgroundColor: colors.surfaceContainerHigh },
                    ]}
                  >
                    {actor.profile_path ? (
                      <Image
                        source={{ uri: actor.profile_path }}
                        style={styles.avatarImage}
                        contentFit="cover"
                        transition={200}
                        accessibilityLabel={actor.name}
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name="account"
                        size={26}
                        color={colors.onSurfaceVariant}
                      />
                    )}
                  </View>

                  <Text
                    variant="caption"
                    color="onSurface"
                    numberOfLines={1}
                    style={{ textAlign: 'center', marginTop: 6, fontWeight: '600' }}
                  >
                    {actor.name}
                  </Text>
                  <Text
                    variant="caption"
                    color="onSurfaceVariant"
                    numberOfLines={1}
                    style={{ textAlign: 'center', fontSize: 11 }}
                  >
                    {actor.character}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* 10. "More Like This" Section */}
        {moreMovies.length > 0 ? (
          <View style={styles.sectionContainer}>
            <Text variant="title3" color="onSurface" style={{ marginBottom: space[3] }}>
              More Like This
            </Text>
            <View style={styles.moreMoviesGrid}>
              {moreMovies.map((otherMovie) => (
                <MovieCard
                  key={otherMovie.id}
                  width={cardWidth}
                  movie={{
                    id: otherMovie.id,
                    title: otherMovie.title,
                    posterUrl: otherMovie.poster_path,
                    rating: otherMovie.vote_average,
                  }}
                  onPress={() => router.push(`/movie/${otherMovie.id}`)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
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
  floatingHeader: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroWrapper: {
    alignItems: 'center',
    paddingHorizontal: space[4],
  },
  heroCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  posterScrim: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  trailerOverlay: {
    position: 'absolute',
    bottom: space[4],
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  trailerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[5],
    paddingVertical: space[2],
    borderRadius: radius.pill,
  },
  heroActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: space[3],
    marginTop: space[1],
  },
  heroActionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[3],
  },
  brandRow: {
    alignItems: 'center',
    marginTop: space[2],
    marginBottom: space[2],
  },
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: space[4],
    marginBottom: space[4],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space[2],
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  ctaContainer: {
    paddingHorizontal: space[4],
    marginBottom: space[4],
  },
  sectionContainer: {
    paddingHorizontal: space[4],
    marginBottom: space[5],
  },
  dayPill: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.pill,
  },
  showtimeCard: {
    width: 170,
    padding: space[3],
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  showtimeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  showtimeBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space[3],
    paddingTop: space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  specsCard: {
    borderRadius: radius.lg,
    padding: space[4],
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space[1],
  },
  specKey: {
    flex: 1,
  },
  specValue: {
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
  },
  specDivider: {
    height: 1,
    marginVertical: space[2],
  },
  castItem: {
    alignItems: 'center',
    width: 68,
  },
  avatarWrapper: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 54,
    height: 54,
  },
  moreMoviesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[3],
  },
});

