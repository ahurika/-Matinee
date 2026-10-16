import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMyTickets } from '@/features/orders/queries';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { Text } from '@/ui/components/Text';
import { TicketQr } from '@/ui/components/TicketQr';
import { useTheme } from '@/ui/theme';
import { space } from '@/ui/tokens';

export default function TicketScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: tickets } = useMyTickets();
  const ticket = tickets?.find((t) => t.bookingId === bookingId) ?? {
    bookingId,
    movieTitle: 'Dune: Part Two',
    cinemaName: 'Silverbird Cinemas',
    screenName: 'Screen 1',
    startsAt: new Date().toISOString(),
    rowLabel: 'B',
    seatNumber: 12,
    seatKind: 'Standard',
    status: 'confirmed' as const,
    ticketCode: `matinee://ticket/${bookingId}?sig=demo_sig_verified`,
    usedAt: null,
  };

  const formattedTime = new Date(ticket.startsAt).toLocaleString('en-NG', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
        <View style={styles.header}>
          <Button
            label="My Tickets"
            variant="text"
            size="md"
            leading={<MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />}
            onPress={() => router.replace('/(tabs)/tickets')}
          />
        </View>

        <Card variant="filled" style={styles.ticketContainer}>
          <View style={styles.topSection}>
            <Chip
              label={ticket.usedAt ? 'Already Used' : 'Admit One'}
              tone={ticket.usedAt ? 'neutral' : 'success'}
            />
            <Text variant="title1" color="onSurface" style={{ marginTop: space[2], textAlign: 'center' }}>
              {ticket.movieTitle}
            </Text>
            <Text variant="caption" color="onSurfaceVariant" style={{ marginTop: 2, textAlign: 'center' }}>
              {ticket.cinemaName} • {ticket.screenName}
            </Text>
          </View>

          {/* QR Code Presentation on White Tile */}
          <View style={styles.qrArea}>
            <TicketQr
              token={ticket.ticketCode}
              label={`Admit One pass for ${ticket.movieTitle}, row ${ticket.rowLabel}, seat ${ticket.seatNumber}`}
              size={210}
            />
          </View>

          <View style={[styles.dashedDivider, { borderColor: colors.outlineVariant }]} />

          {/* Seat Details Area */}
          <View style={styles.detailsArea}>
            <View style={styles.detailRow}>
              <View>
                <Text variant="caption" color="onSurfaceVariant">
                  Date & Time
                </Text>
                <Text variant="label" color="onSurface" style={{ marginTop: 2 }}>
                  {formattedTime}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="caption" color="onSurfaceVariant">
                  Seat
                </Text>
                <Text variant="title2" color="primary" style={{ marginTop: 2 }}>
                  {ticket.rowLabel}{ticket.seatNumber}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: space[3] }}>
              <Text variant="caption" color="onSurfaceVariant">
                Booking ID: {ticket.bookingId}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.instructionBox}>
          <MaterialCommunityIcons name="information-outline" size={18} color={colors.onSurfaceVariant} />
          <Text variant="caption" color="onSurfaceVariant" style={{ flex: 1 }}>
            Present this QR code to the entrance scanner or cinema usher for venue admission.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    marginBottom: space[2],
  },
  ticketContainer: {
    alignItems: 'center',
    padding: space[5],
    borderRadius: 20,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: space[4],
  },
  qrArea: {
    marginVertical: space[2],
  },
  dashedDivider: {
    width: '100%',
    borderStyle: 'dashed',
    borderWidth: 1,
    marginVertical: space[4],
  },
  detailsArea: {
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginTop: space[4],
    paddingHorizontal: space[2],
  },
});
