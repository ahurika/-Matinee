import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useJoinWaitingRoom } from '@/features/showtimes/queries';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { CountdownPill } from '@/ui/components/CountdownPill';
import { Skeleton } from '@/ui/components/Skeleton';
import { Text } from '@/ui/components/Text';
import { useTheme } from '@/ui/theme';
import { space } from '@/ui/tokens';

export default function WaitingRoomScreen() {
  const { showtimeId } = useLocalSearchParams<{ showtimeId: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const joinMutation = useJoinWaitingRoom(showtimeId);
  const [position, setPosition] = useState<number | null>(null);
  const [waitSec, setWaitSec] = useState<number>(0);

  useEffect(() => {
    joinMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (data.status === 'admitted') {
          // Under capacity: immediately navigate into seat map
          router.replace(`/seats/${showtimeId}`);
        } else {
          // Surge capacity: queue up
          setPosition(data.position ?? 1);
          setWaitSec(data.estimatedWaitSeconds ?? 15);
        }
      },
      onError: () => {
        // Fallback: permit entrance if waiting room service down
        router.replace(`/seats/${showtimeId}`);
      },
    });
  }, [showtimeId]);

  // Simulate queue countdown progress
  useEffect(() => {
    if (position === null) return;
    const interval = setInterval(() => {
      setPosition((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          router.replace(`/seats/${showtimeId}`);
          return 0;
        }
        return prev - 1;
      });
      setWaitSec((prev) => Math.max(0, prev - 1));
    }, 1200);

    return () => clearInterval(interval);
  }, [position, showtimeId]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + space[4] }]}>
      <Card variant="filled" style={styles.card}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="account-group" size={48} color={colors.primary} />
        </View>

        <Text variant="title1" color="onSurface" style={styles.title}>
          High Demand Right Now
        </Text>

        <Text variant="body" color="onSurfaceVariant" style={styles.body}>
          Thousands of cinema fans are booking seats simultaneously. You are held in line to guarantee seat selection integrity.
        </Text>

        {position !== null ? (
          <View style={styles.queueBox}>
            <Text variant="caption" color="onSurfaceVariant">
              Your Queue Position
            </Text>
            <Text variant="display" color="primary" style={{ marginVertical: space[1] }}>
              #{position}
            </Text>
            <CountdownPill
              label={`~${waitSec}s remaining`}
              tone={waitSec < 10 ? 'warning' : 'normal'}
            />
          </View>
        ) : (
          <View style={{ alignItems: 'center', marginVertical: space[4], gap: space[2] }}>
            <Skeleton width={140} height={36} radius="sm" />
            <Skeleton width={100} height={20} radius="xs" />
          </View>
        )}

        <Text variant="caption" color="onSurfaceVariant" style={styles.footerNote}>
          Please keep this screen open. You will automatically enter the seat selection screen when admitted.
        </Text>

        <Button
          label="Leave Line"
          variant="outline"
          onPress={() => router.back()}
          style={{ marginTop: space[4] }}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: space[4],
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    padding: space[6],
  },
  iconContainer: {
    marginBottom: space[3],
  },
  title: {
    textAlign: 'center',
    marginBottom: space[2],
  },
  body: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: space[4],
  },
  queueBox: {
    alignItems: 'center',
    paddingVertical: space[3],
    paddingHorizontal: space[6],
    borderRadius: 12,
    marginBottom: space[3],
  },
  footerNote: {
    textAlign: 'center',
    marginTop: space[2],
    lineHeight: 18,
  },
});
