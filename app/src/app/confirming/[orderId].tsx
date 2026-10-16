import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOrderDetail } from '@/features/orders/queries';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { ConfirmationCelebration } from '@/ui/components/ConfirmationCelebration';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/theme';
import { space } from '@/ui/tokens';

export default function ConfirmingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: order, isLoading } = useOrderDetail(orderId);

  const isPaid = order?.status === 'paid';
  const isRefunded = order?.status === 'paid_unfulfilled' || order?.status === 'refunded';
  const firstBookingId = order?.tickets?.[0]?.bookingId;

  useEffect(() => {
    if (isPaid && firstBookingId) {
      // Auto-navigate to ticket after 2 seconds
      const timeout = setTimeout(() => {
        router.replace(`/ticket/${firstBookingId}`);
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [isPaid, firstBookingId]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Card variant="filled" style={styles.card}>
        {isLoading || (!isPaid && !isRefunded) ? (
          <View style={styles.statusBox}>
            <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: space[4] }} />
            <Text variant="title2" color="onSurface" style={styles.title}>
              Confirming Your Payment
            </Text>
            <Text variant="bodySmall" color="onSurfaceVariant" style={styles.body}>
              Waiting for Paystack's verified webhook to confirm your booking and issue signed QR tickets...
            </Text>
          </View>
        ) : isPaid ? (
          <View style={styles.statusBox}>
            <ConfirmationCelebration
              title="Booking Confirmed!"
              subtitle="Your seats are guaranteed and locked. Your signed QR entry pass is ready."
            />

            {firstBookingId ? (
              <Button
                label="View Ticket Pass"
                size="lg"
                onPress={() => router.replace(`/ticket/${firstBookingId}`)}
                style={{ marginTop: space[4] }}
              />
            ) : null}
          </View>
        ) : (
          <View style={styles.statusBox}>
            <View style={[styles.iconCircle, { backgroundColor: colors.errorContainer }]}>
              <MaterialCommunityIcons name="alert-circle" size={40} color={colors.onErrorContainer} />
            </View>
            <Text variant="title1" color="onSurface" style={styles.title}>
              Seats Were Taken
            </Text>
            <Text variant="bodySmall" color="onSurfaceVariant" style={styles.body}>
              Your payment arrived after the seat hold expired and another user booked them. A full refund of NGN {((order?.totalKobo ?? 0) / 100).toLocaleString()} has been queued back to your account.
            </Text>
            <Button
              label="Back to Movies"
              variant="outline"
              size="lg"
              onPress={() => router.replace('/(tabs)')}
              style={{ marginTop: space[4] }}
            />
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space[4],
  },
  card: {
    padding: space[6],
    alignItems: 'center',
  },
  statusBox: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space[4],
  },
  title: {
    textAlign: 'center',
    marginBottom: space[2],
  },
  body: {
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
