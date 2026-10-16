import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSearchMovies } from '@/features/movies/queries';
import { EmptyState } from '@/ui/components/EmptyState';
import { Input } from '@/ui/components/Input';
import { MovieCard, MovieCardSkeleton } from '@/ui/components/MovieCard';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/theme';
import { space } from '@/ui/tokens';

export default function SearchScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [inputVal, setInputVal] = useState('');
  const [debouncedVal, setDebouncedVal] = useState('');

  // Debounce input 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedVal(inputVal.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [inputVal]);

  const { data, isLoading } = useSearchMovies(debouncedVal);
  const cardWidth = Math.floor((width - space[4] * 2 - space[3]) / 2);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + space[3],
        paddingBottom: space[8],
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text variant="title1" color="onSurface">
          Search Films
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Input
          label="Find by Title"
          value={inputVal}
          onChangeText={setInputVal}
          placeholder="e.g. Dune, Oppenheimer..."
          leading={<MaterialCommunityIcons name="magnify" size={20} color={colors.onSurfaceVariant} />}
        />
      </View>

      {debouncedVal.length < 2 ? (
        <EmptyState
          icon="movie-search-outline"
          title="Search Movies"
          message="Type at least 2 characters to search across TMDB's film catalog."
        />
      ) : isLoading ? (
        <View style={styles.gridContainer}>
          {Array.from({ length: 4 }).map((_, i) => (
            <MovieCardSkeleton key={i} width={cardWidth} />
          ))}
        </View>
      ) : !data?.results || data.results.length === 0 ? (
        <EmptyState
          icon="filmstrip-off"
          title="No Results Found"
          message={`No films matched "${debouncedVal}". Check your spelling or try another title.`}
        />
      ) : (
        <View style={styles.gridContainer}>
          {data.results.map((movie) => (
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space[4],
    marginBottom: space[3],
  },
  searchContainer: {
    paddingHorizontal: space[4],
    marginBottom: space[6],
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: space[4],
    gap: space[3],
  },
});
