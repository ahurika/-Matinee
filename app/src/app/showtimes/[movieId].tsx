import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMovieDetail } from '@/features/movies/queries';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/theme';
import { radius, space } from '@/ui/tokens';

// Seed demo showtimes for Silverbird Cinemas and Filmhouse
const DEMO_SHOWTIMES = [
  {
    id: 'st-dune-sb1-today-1800',
    cinemaName: 'Silverbird Cinemas',
    cinemaCity: 'Victoria Island, Lagos',
    screenName: 'Screen 1 (Standard 320 seats)',
    time: '18:00',
    state: 'available' as const,
    priceNaira: '4,500',
  },
  {
    id: 'st-dune-sb2-today-2030',
    cinemaName: 'Silverbird Cinemas',
    cinemaCity: 'Victoria Island, Lagos',
    screenName: 'Screen 2 (VIP 320 seats)',
    time: '20:30',
    state: 'filling_fast' as const,
    priceNaira: '6,500',
  },
  {
    id: 'st-dune-fh1-today-1900',
    cinemaName: 'Filmhouse IMAX',
    cinemaCity: 'Lekki Phase 1, Lagos',
    screenName: 'IMAX Screen (320 seats)',
    time: '19:00',
    state: 'available' as const,
    priceNaira: '5,000',
  },
  {
    id: 'st-dune-fh2-today-2145',
    cinemaName: 'Filmhouse IMAX',
    cinemaCity: 'Lekki Phase 1, Lagos',
    screenName: 'Screen 2',
    time: '21:45',
    state: 'opens_later' as const,
    opensAt: 'Opens 17:00',
    priceNaira: '4,500',
  },
];

export default function ShowtimesScreen() {
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: movieData } = useMovieDetail(movieId);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Generate next 7 days
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNum: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
    };
  });

  const handleSelectShowtime = (st: (typeof DEMO_SHOWTIMES)[0]) => {
    if (st.state === 'opens_later') return;
    router.push(`/waiting-room/${st.id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + space[3],
          paddingBottom: space[8],
          paddingHorizontal: space[4],
        }}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Button
            label="Back"
            variant="text"
            size="md"
            leading={<MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />}
            onPress={() => router.back()}
          />
        </View>

        <View style={styles.titleArea}>
          <Text variant="title1" color="onSurface">
            {movieData?.movie.title || 'Select Showtime'}
          </Text>
          <Text variant="bodySmall" color="onSurfaceVariant">
            Pick a cinema and session time
          </Text>
        </View>

        {/* Date Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStrip}
        >
          {days.map((d, index) => {
            const isSelected = selectedDayIndex === index;
            return (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`${d.dayName}, ${d.month} ${d.dateNum}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedDayIndex(index)}
                style={[
                  styles.datePill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surfaceContainerHigh,
                    borderColor: isSelected ? colors.primary : colors.outlineVariant,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  style={{
                    color: isSelected ? colors.onPrimary : colors.onSurfaceVariant,
                    fontWeight: '700',
                  }}
                >
                  {d.dayName}
                </Text>
                <Text
                  variant="title3"
                  style={{
                    color: isSelected ? colors.onPrimary : colors.onSurface,
                    marginTop: 2,
                  }}
                >
                  {d.dateNum}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Cinemas & Showtimes List */}
        <View style={{ gap: space[4], marginTop: space[4] }}>
          {/* Cinema 1: Silverbird */}
          <Card variant="filled">
            <Text variant="title3" color="onSurface">
              Silverbird Cinemas
            </Text>
            <Text variant="caption" color="onSurfaceVariant" style={{ marginBottom: space[3] }}>
              133 Ahmadu Bello Way, Victoria Island, Lagos
            </Text>

            <View style={styles.timeGrid}>
              {DEMO_SHOWTIMES.filter((s) => s.cinemaName.includes('Silverbird')).map((st) => (
                <Pressable
                  key={st.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${st.time}, ${st.priceNaira} naira, ${st.state}`}
                  onPress={() => handleSelectShowtime(st)}
                  style={[
                    styles.timeCard,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor:
                        st.state === 'filling_fast' ? colors.warning : colors.outlineVariant,
                    },
                  ]}
                >
                  <Text variant="label" color="onSurface">
                    {st.time}
                  </Text>
                  <Text variant="caption" color="onSurfaceVariant">
                    NGN {st.priceNaira}
                  </Text>

                  {st.state === 'filling_fast' ? (
                    <Chip label="Filling fast" tone="warning" style={{ marginTop: 4 }} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </Card>

          {/* Cinema 2: Filmhouse IMAX */}
          <Card variant="filled">
            <Text variant="title3" color="onSurface">
              Filmhouse IMAX
            </Text>
            <Text variant="caption" color="onSurfaceVariant" style={{ marginBottom: space[3] }}>
              The Rock Drive, Lekki Phase 1, Lagos
            </Text>

            <View style={styles.timeGrid}>
              {DEMO_SHOWTIMES.filter((s) => s.cinemaName.includes('Filmhouse')).map((st) => (
                <Pressable
                  key={st.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${st.time}, ${st.state}`}
                  disabled={st.state === 'opens_later'}
                  onPress={() => handleSelectShowtime(st)}
                  style={[
                    styles.timeCard,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor: colors.outlineVariant,
                      opacity: st.state === 'opens_later' ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text variant="label" color="onSurface">
                    {st.time}
                  </Text>
                  <Text variant="caption" color="onSurfaceVariant">
                    NGN {st.priceNaira}
                  </Text>

                  {st.state === 'opens_later' ? (
                    <Chip label={st.opensAt!} tone="neutral" style={{ marginTop: 4 }} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    marginBottom: space[2],
    alignItems: 'flex-start',
  },
  titleArea: {
    marginBottom: space[4],
  },
  dateStrip: {
    gap: space[2],
    paddingBottom: space[2],
  },
  datePill: {
    width: 68,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  timeCard: {
    width: '48%',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space[3],
    alignItems: 'flex-start',
  },
});
