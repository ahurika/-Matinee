import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateOrder } from '@/features/orders/queries';
import { useShowtimeDetail } from '@/features/showtimes/queries';
import { useBookingStore } from '@/state/useBookingStore';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { CountdownPill } from '@/ui/components/CountdownPill';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';
import { toUxMessage } from '@/ui/errorMessages';
import { useTheme } from '@/ui/theme';
import { useHoldCountdown } from '@/ui/useHoldCountdown';
import { space } from '@/ui/tokens';

export default function CheckoutScreen() {
  const { showtimeId } = useLocalSearchParams<{ showtimeId: string }>();
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const activeHold = useBookingStore((s) => s.activeHold);
  const countdown = useHoldCountdown(activeHold?.expiresAtMs ?? null, activeHold?.serverNowMs);

  const { data: showtimeData } = useShowtimeDetail(showtimeId);
  const createOrderMutation = useCreateOrder();

  const [idempotencyKey] = useState(() => `idem_${Date.now()}_${Math.random().toString(36).substring(7)}`);

  const seatCount = activeHold?.seatIds.length ?? 1;
  const standardPrice = showtimeData?.showtime.priceStandardKobo ?? 450000;
  const subtotalKobo = seatCount * standardPrice;
  // Server formula: max(5000, floor(subtotal * 5 / 100))
  const feeKobo = Math.max(5000, Math.floor((subtotalKobo * 5) / 100));
  const totalKobo = subtotalKobo + feeKobo;

  const handlePay = () => {
    createOrderMutation.mutate(
      { showtimeId, idempotencyKey },
      {
        onSuccess: (order) => {
          // Navigate to confirming screen with orderId
          router.replace(`/confirming/${order.orderId}`);
        },
        onError: (err: any) => {
          const ux = toUxMessage(err.code || 'PAYMENT_FAILED');
          toast.show({ message: ux.message, tone: 'error' });
        },
      },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + space[3],
          paddingBottom: 120,
          paddingHorizontal: space[4],
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Button
            label="Back"
            variant="text"
            size="md"
            leading={<MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />}
            onPress={() => router.back()}
          />

          <CountdownPill
            label={countdown.label}
            tone={countdown.remainingMs < 60_000 ? 'warning' : 'normal'}
          />
        </View>

        <View style={styles.titleArea}>
          <Text variant="title1" color="onSurface">
            Order Summary
          </Text>
          <Text variant="caption" color="onSurfaceVariant">
            Review your seats and price breakdown
          </Text>
        </View>

        {/* Showtime Info Card */}
        <Card variant="filled" style={styles.sectionCard}>
          <Text variant="title3" color="onSurface">
            Silverbird Cinemas
          </Text>
          <Text variant="caption" color="onSurfaceVariant">
            Screen 1 • Today, 18:00
          </Text>

          <View style={styles.seatRow}>
            <Text variant="label" color="primary">
              Held Seats ({seatCount}):
            </Text>
            <Text variant="label" color="onSurface" style={{ marginLeft: 6 }}>
              {activeHold?.seatIds.map((s) => s.split('-').pop()).join(', ') || 'A1, A2'}
            </Text>
          </View>
        </Card>

        {/* Itemized Price Breakdown */}
        <Card variant="outlined" style={styles.sectionCard}>
          <Text variant="title3" color="onSurface" style={{ marginBottom: space[3] }}>
            Price Breakdown
          </Text>

          <View style={styles.lineItem}>
            <Text variant="body" color="onSurface">
              Standard Ticket (x{seatCount})
            </Text>
            <Text variant="label" color="onSurface">
              NGN {(subtotalKobo / 100).toLocaleString()}
            </Text>
          </View>

          <View style={styles.lineItem}>
            <Text variant="body" color="onSurfaceVariant">
              Convenience Fee (5%)
            </Text>
            <Text variant="label" color="onSurfaceVariant">
              NGN {(feeKobo / 100).toLocaleString()}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

          <View style={styles.lineItem}>
            <Text variant="title2" color="primary">
              Total Amount
            </Text>
            <Text variant="title2" color="primary">
              NGN {(totalKobo / 100).toLocaleString()}
            </Text>
          </View>
        </Card>

        {/* Security & Test Mode Notice */}
        <Card variant="filled" style={styles.noticeCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <MaterialCommunityIcons name="shield-check" size={20} color={colors.primary} />
            <Text variant="label" color="onSurface">
              Paystack Test Checkout
            </Text>
          </View>
          <Text variant="caption" color="onSurfaceVariant" style={{ marginTop: space[1] }}>
            Running in authenticated test mode. No actual debit occurs. Webhook confirmation will issue your QR ticket.
          </Text>
        </Card>
      </ScrollView>

      {/* Floating Bottom Action Bar */}
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
        <Button
          label="Pay with Paystack"
          size="lg"
          fullWidth
          loading={createOrderMutation.isPending}
          onPress={handlePay}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space[2],
  },
  titleArea: {
    marginBottom: space[4],
  },
  sectionCard: {
    marginBottom: space[3],
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space[2],
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space[2],
  },
  divider: {
    height: 1,
    marginVertical: space[2],
  },
  noticeCard: {
    marginBottom: space[3],
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: space[4],
    paddingTop: space[3],
  },
});
