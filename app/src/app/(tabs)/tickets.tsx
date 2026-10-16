import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMyTickets } from '@/features/orders/queries';
import { useAuthStore } from '@/state/useAuthStore';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { EmptyState } from '@/ui/components/EmptyState';
import { Poster } from '@/ui/components/Poster';
import { Skeleton } from '@/ui/components/Skeleton';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/theme';
import { space } from '@/ui/tokens';

export default function MyTicketsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: tickets, isLoading, refetch, isRefetching } = useMyTickets();

  if (!isAuthenticated) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <EmptyState
          icon="account-lock-outline"
          title="Sign In to View Tickets"
          message="Log in with your Matinee account to view and present your booked cinema passes."
          actionLabel="Sign In"
          onAction={() => router.push('/auth')}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + space[3],
        paddingBottom: space[8],
        paddingHorizontal: space[4],
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.header}>
        <Text variant="title1" color="onSurface">
          My Tickets
        </Text>
        <Text variant="bodySmall" color="onSurfaceVariant">
          Active passes and booking history
        </Text>
      </View>

      {isLoading ? (
        <View style={{ gap: space[3], marginTop: space[4] }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} variant="filled">
              <View style={{ flexDirection: 'row', gap: space[3] }}>
                <Skeleton width={80} height={120} radius="md" />
                <View style={{ flex: 1, gap: space[2] }}>
                  <Skeleton width="70%" height={20} radius="xs" />
                  <Skeleton width="50%" height={16} radius="xs" />
                  <Skeleton width="40%" height={16} radius="xs" />
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : !tickets || tickets.length === 0 ? (
        <EmptyState
          icon="ticket-outline"
          title="No Booked Tickets"
          message="You have no upcoming cinema passes. Browse showtimes and pick your seats to book."
          actionLabel="Find Movies"
          onAction={() => router.push('/(tabs)')}
        />
      ) : (
        <View style={{ gap: space[3], marginTop: space[4] }}>
          {tickets.map((t) => {
            const formattedTime = new Date(t.startsAt).toLocaleString('en-NG', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Card
                key={t.bookingId}
                variant="filled"
                onPress={() => router.push(`/ticket/${t.bookingId}`)}
              >
                <View style={styles.ticketCardRow}>
                  <Poster uri={t.moviePosterUrl} width={75} title={t.movieTitle} radius="sm" />

                  <View style={styles.ticketCardInfo}>
                    <View style={styles.badgeRow}>
                      <Chip
                        label={t.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}
                        tone={t.status === 'confirmed' ? 'success' : 'error'}
                      />
                      {t.usedAt ? <Chip label="Used" tone="neutral" /> : null}
                    </View>

                    <Text variant="title3" color="onSurface" numberOfLines={1}>
                      {t.movieTitle}
                    </Text>

                    <Text variant="caption" color="onSurfaceVariant" numberOfLines={1}>
                      {t.cinemaName} • {t.screenName}
                    </Text>

                    <View style={styles.metaRow}>
                      <MaterialCommunityIcons
                        name="calendar-clock"
                        size={14}
                        color={colors.primary}
                        style={{ marginRight: 4 }}
                      />
                      <Text variant="caption" color="primary">
                        {formattedTime}
                      </Text>
                    </View>

                    <View style={styles.seatPill}>
                      <Text variant="caption" color="onSurface">
                        Seat: Row {t.rowLabel}, Seat {t.seatNumber} ({t.seatKind})
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.cardFooter, { borderTopColor: colors.outlineVariant }]}>
                  <Text variant="caption" color="onSurfaceVariant">
                    Tap to show QR code for entry
                  </Text>
                  <MaterialCommunityIcons name="qrcode" size={18} color={colors.primary} />
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space[4],
  },
  header: {
    marginBottom: space[2],
  },
  ticketCardRow: {
    flexDirection: 'row',
    gap: space[3],
  },
  ticketCardInfo: {
    flex: 1,
    gap: space[1],
  },
  badgeRow: {
    flexDirection: 'row',
    gap: space[2],
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatPill: {
    marginTop: space[1],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space[3],
    paddingTop: space[2],
    borderTopWidth: 1,
  },
});
