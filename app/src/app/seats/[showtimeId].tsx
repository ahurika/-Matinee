import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useHoldSeats,
  useReleaseSeats,
  useSeatAvailability,
  useShowtimeDetail,
} from '@/features/showtimes/queries';
import { useAuthStore } from '@/state/useAuthStore';
import { useBookingStore } from '@/state/useBookingStore';
import { Button } from '@/ui/components/Button';
import { CountdownPill } from '@/ui/components/CountdownPill';
import { Skeleton } from '@/ui/components/Skeleton';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';
import { toUxMessage } from '@/ui/errorMessages';
import { SeatListPicker } from '@/ui/seatmap/SeatListPicker';
import { SeatMap } from '@/ui/seatmap/SeatMap';
import { buildHall } from '@/ui/seatmap/layout';
import type { Seat } from '@/ui/seatmap/types';
import { useTheme } from '@/ui/theme';
import { useHoldCountdown } from '@/ui/useHoldCountdown';
import { space } from '@/ui/tokens';

const FALLBACK_HALL = buildHall();

export default function SeatSelectionScreen() {
  const { showtimeId } = useLocalSearchParams<{ showtimeId: string }>();
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: showtimeData } = useShowtimeDetail(showtimeId);
  const { data: availability, isLoading: loadingSeats } = useSeatAvailability(showtimeId);

  const [selectedSeatIds, setSelectedSeatIds] = useState<ReadonlySet<string>>(new Set());
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null);
  const [showListPicker, setShowListPicker] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (enabled) setShowListPicker(true);
    }).catch(() => {});
  }, []);

  const countdown = useHoldCountdown(expiresAtMs);
  const holdMutation = useHoldSeats(showtimeId);
  const releaseMutation = useReleaseSeats(showtimeId);
  const setActiveHold = useBookingStore((s) => s.setActiveHold);

  const seatsToRender: Seat[] = availability?.seats?.length ? availability.seats : FALLBACK_HALL;

  const handleToggleSeat = (seat: Seat, nextSelected: boolean) => {
    setSelectedSeatIds((prev) => {
      const next = new Set(prev);
      if (nextSelected) {
        if (next.size >= 8) {
          toast.show({
            message: toUxMessage('SEAT_LIMIT').message,
            tone: 'warning',
          });
          return prev;
        }
        next.add(seat.id);
      } else {
        next.delete(seat.id);
      }
      return next;
    });
  };

  const calculateSubtotalNaira = () => {
    const standardPrice = showtimeData?.showtime.priceStandardKobo ?? 450000;
    const totalKobo = selectedSeatIds.size * standardPrice;
    return (totalKobo / 100).toLocaleString();
  };

  const handleContinue = async () => {
    if (selectedSeatIds.size === 0) return;

    if (!isAuthenticated) {
      toast.show({ message: 'Please sign in to complete your booking', tone: 'info' });
      router.push('/auth');
      return;
    }

    const seatArray = Array.from(selectedSeatIds);

    holdMutation.mutate(seatArray, {
      onSuccess: (data) => {
        const expMs = new Date(data.expiresAt).getTime();
        setExpiresAtMs(expMs);

        setActiveHold({
          holdId: data.holdId,
          showtimeId,
          seatIds: data.seatIds,
          expiresAtMs: expMs,
          serverNowMs: new Date(data.serverNow).getTime(),
        });

        router.push(`/checkout/${showtimeId}`);
      },
      onError: (err: any) => {
        const ux = toUxMessage(err.code || 'SEAT_TAKEN');
        toast.show({ message: ux.message, tone: 'error' });
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + space[2] }]}>
        <Button
          label="Back"
          variant="text"
          size="md"
          leading={<MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />}
          onPress={() => {
            if (selectedSeatIds.size > 0) releaseMutation.mutate();
            router.back();
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <Button
            label="List"
            variant="outline"
            size="md"
            leading={<MaterialCommunityIcons name="format-list-bulleted" size={16} color={colors.primary} />}
            onPress={() => setShowListPicker(true)}
          />

          {expiresAtMs ? (
            <CountdownPill
              label={countdown.label}
              tone={countdown.remainingMs < 60_000 ? 'warning' : 'normal'}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.titleArea}>
        <Text variant="title1" color="onSurface">
          Choose Seats
        </Text>
        <Text variant="caption" color="onSurfaceVariant">
          Screen 1 • 320 Seats • {availability?.availableCount ?? 320} available
        </Text>
      </View>

      {/* Seat Map Viewport */}
      <View style={styles.mapContainer}>
        {loadingSeats ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', height: 360, gap: space[3] }}>
            <Skeleton width="90%" height={300} radius="md" />
            <Text variant="caption" color="onSurfaceVariant">
              Loading interactive seat map...
            </Text>
          </View>
        ) : (
          <SeatMap
            seats={seatsToRender}
            selectedIds={selectedSeatIds}
            availableWidth={width}
            onToggle={handleToggleSeat}
            onLimitReached={() => {
              toast.show({ message: toUxMessage('SEAT_LIMIT').message, tone: 'warning' });
            }}
          />
        )}
      </View>

      {/* Bottom Sticky Booking Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surfaceContainer,
            borderTopColor: colors.outlineVariant,
            paddingBottom: insets.bottom + space[3],
          },
          shadow('lg'),
        ]}
      >
        <View style={styles.barSummary}>
          <View>
            <Text variant="caption" color="onSurfaceVariant">
              {selectedSeatIds.size} of 8 seats selected
            </Text>
            <Text variant="title2" color="primary">
              NGN {calculateSubtotalNaira()}
            </Text>
          </View>

          <Button
            label="Continue"
            size="lg"
            disabled={selectedSeatIds.size === 0}
            loading={holdMutation.isPending}
            onPress={handleContinue}
            style={styles.continueButton}
          />
        </View>
      </View>

      <SeatListPicker
        visible={showListPicker}
        onClose={() => setShowListPicker(false)}
        seats={seatsToRender}
        selectedIds={selectedSeatIds}
        onToggle={handleToggleSeat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[4],
    marginBottom: space[2],
  },
  titleArea: {
    paddingHorizontal: space[4],
    marginBottom: space[2],
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: space[4],
    paddingTop: space[3],
  },
  barSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  continueButton: {
    minWidth: 140,
  },
});
