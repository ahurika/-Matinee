import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/ui/components/Badge';
import { BottomSheet } from '@/ui/components/BottomSheet';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { ConfirmationCelebration } from '@/ui/components/ConfirmationCelebration';
import { CountdownPill } from '@/ui/components/CountdownPill';
import { Dialog } from '@/ui/components/Dialog';
import { EmptyState } from '@/ui/components/EmptyState';
import { Input } from '@/ui/components/Input';
import { MovieCard, MovieCardSkeleton } from '@/ui/components/MovieCard';
import { Skeleton } from '@/ui/components/Skeleton';
import { Text } from '@/ui/components/Text';
import { TicketQr } from '@/ui/components/TicketQr';
import { ToastProvider, useToast } from '@/ui/components/Toast';
import { SeatListPicker } from '@/ui/seatmap/SeatListPicker';
import { SeatMap } from '@/ui/seatmap/SeatMap';
import { buildHall } from '@/ui/seatmap/layout';
import type { Seat } from '@/ui/seatmap/types';
import { ThemeProvider, useTheme, type ThemeMode } from '@/ui/theme';
import {
  darkColors,
  lightColors,
  radius,
  space,
  type ColorRole,
  type TextVariant,
} from '@/ui/tokens';

// Sample mock hall for the gallery
const MOCK_HALL: Seat[] = buildHall().map((s, i) => ({
  ...s,
  status: i % 11 === 0 ? 'sold' : i % 19 === 0 ? 'held' : 'available',
}));

export default function GalleryScreen() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  return (
    <ThemeProvider mode={themeMode}>
      <ToastProvider>
        <GalleryContent themeMode={themeMode} onToggleTheme={(m) => setThemeMode(m)} />
      </ToastProvider>
    </ThemeProvider>
  );
}

function GalleryContent({
  themeMode,
  onToggleTheme,
}: {
  themeMode: ThemeMode;
  onToggleTheme: (m: ThemeMode) => void;
}) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  // Interactive component states
  const [inputText, setInputText] = useState('Dune: Part Two');
  const [inputPassword, setInputPassword] = useState('secret123');
  const [chipSelected, setChipSelected] = useState<string>('Standard');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [listPickerVisible, setListPickerVisible] = useState(false);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [selectedSeats, setSelectedSeats] = useState<ReadonlySet<string>>(new Set());

  const sampleRoles: ColorRole[] = [
    'primary',
    'primaryContainer',
    'secondary',
    'secondaryContainer',
    'surface',
    'surfaceContainerLow',
    'surfaceContainerHigh',
    'outline',
    'error',
    'warning',
    'success',
    'info',
  ];

  const typographyVariants: TextVariant[] = [
    'display',
    'title1',
    'title2',
    'title3',
    'body',
    'bodySmall',
    'label',
    'caption',
    'overline',
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + space[4], paddingBottom: insets.bottom + space[8] },
      ]}
    >
      {/* Top Header & Theme Switcher */}
      <View style={styles.headerRow}>
        <View>
          <Text variant="display" color="onSurface">
            Matinee
          </Text>
          <Text variant="bodySmall" color="onSurfaceVariant">
            Design System & Living Component Gallery
          </Text>
        </View>

        <View style={styles.themeToggle}>
          <Text variant="caption" color="onSurfaceVariant">
            {isDark ? 'Dark' : 'Light'}
          </Text>
          <Switch
            value={isDark}
            onValueChange={(val) => onToggleTheme(val ? 'dark' : 'light')}
            trackColor={{ false: colors.surfaceContainerHigh, true: colors.primaryContainer }}
            thumbColor={colors.primary}
          />
        </View>
      </View>

      {/* 1. Color Palette Swatches */}
      <Section title="1. Color Tokens (Seed #E8590C)">
        <View style={styles.swatchGrid}>
          {sampleRoles.map((role) => (
            <View key={role} style={styles.swatchItem}>
              <View
                style={[
                  styles.swatchColor,
                  {
                    backgroundColor: colors[role],
                    borderColor: colors.outlineVariant,
                  },
                ]}
              />
              <Text variant="caption" color="onSurface" numberOfLines={1}>
                {role}
              </Text>
              <Text variant="caption" color="onSurfaceVariant">
                {colors[role]}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      {/* 2. Typography Scale */}
      <Section title="2. Typography (Manrope)">
        <View style={styles.typoList}>
          {typographyVariants.map((v) => (
            <View key={v} style={styles.typoItem}>
              <Text variant="caption" color="onSurfaceVariant" style={styles.typoLabel}>
                {v}
              </Text>
              <Text variant={v} color="onSurface">
                Cinema Ticket Booking
              </Text>
            </View>
          ))}
        </View>
      </Section>

      {/* 3. Button Component */}
      <Section title="3. Button (Variants & States)">
        <View style={styles.rowWrap}>
          <Button label="Primary (md)" size="md" />
          <Button label="Primary (lg)" size="lg" />
          <Button label="Secondary" variant="secondary" />
          <Button label="Outline" variant="outline" />
          <Button label="Text" variant="text" />
          <Button label="Destructive" variant="destructive" />
          <Button label="Loading" loading />
          <Button label="Disabled" disabled />
          <Button
            label="Leading Icon"
            leading={<MaterialCommunityIcons name="ticket-confirmation-outline" size={18} color={colors.onPrimary} />}
          />
        </View>
      </Section>

      {/* 4. Input Component */}
      <Section title="4. Input Fields">
        <View style={{ gap: space[4] }}>
          <Input
            label="Movie Title"
            value={inputText}
            onChangeText={setInputText}
            helper="Enter film query to search"
            leading={<MaterialCommunityIcons name="magnify" size={20} color={colors.onSurfaceVariant} />}
          />

          <Input
            label="Password"
            value={inputPassword}
            onChangeText={setInputPassword}
            secure
            helper="Minimum 10 characters required"
          />

          <Input
            label="Email Address"
            value="invalid-email"
            onChangeText={() => {}}
            error="Please provide a valid email format"
          />

          <Input
            label="Disabled Field"
            value="Read only configuration"
            onChangeText={() => {}}
            disabled
          />
        </View>
      </Section>

      {/* 5. Chips */}
      <Section title="5. Chips & Filters">
        <View style={styles.rowWrap}>
          {['Standard', 'VIP', 'IMAX', '4DX'].map((c) => (
            <Chip
              key={c}
              label={c}
              selected={chipSelected === c}
              onPress={() => setChipSelected(c)}
            />
          ))}
          <Chip label="Info Note" tone="info" />
          <Chip label="Warning" tone="warning" />
          <Chip label="Error" tone="error" />
          <Chip label="Confirmed" tone="success" />
        </View>
      </Section>

      {/* 6. Badges & Countdown Pills */}
      <Section title="6. Badges & Timers">
        <View style={styles.rowWrap}>
          <Badge count={4} tone="primary" />
          <Badge count={12} tone="primary" />
          <Badge count={1} tone="error" />
          <Badge dot tone="primary" />
          <Badge dot tone="error" />
        </View>

        <View style={[styles.rowWrap, { marginTop: space[3] }]}>
          <CountdownPill label="04:45" tone="normal" />
          <CountdownPill label="00:52" tone="warning" />
          <CountdownPill label="Expired" tone="expired" />
        </View>
      </Section>

      {/* 7. Cards */}
      <Section title="7. Cards">
        <View style={{ gap: space[3] }}>
          <Card variant="filled">
            <Text variant="title3" color="onSurface">
              Filled Card (surfaceContainerLow)
            </Text>
            <Text variant="bodySmall" color="onSurfaceVariant" style={{ marginTop: space[1] }}>
              Tonal elevation without artificial drop shadow. Complies with flat surface rules.
            </Text>
          </Card>

          <Card variant="outlined">
            <Text variant="title3" color="onSurface">
              Outlined Card (1 dp outlineVariant)
            </Text>
            <Text variant="bodySmall" color="onSurfaceVariant" style={{ marginTop: space[1] }}>
              Subtle boundary separation on screen background.
            </Text>
          </Card>

          <Card
            variant="filled"
            onPress={() => toast.show({ message: 'Tapped interactive card!', tone: 'info' })}
          >
            <Text variant="title3" color="primary">
              Interactive Card (Pressable)
            </Text>
            <Text variant="bodySmall" color="onSurfaceVariant" style={{ marginTop: space[1] }}>
              Includes scale down animation on tap and light haptic feedback.
            </Text>
          </Card>
        </View>
      </Section>

      {/* 8. MovieCard & Skeleton */}
      <Section title="8. MovieCard & MovieCardSkeleton">
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          <MovieCard
            width={(width - space[4] * 2 - space[3] * 2) / 3}
            movie={{
              id: 693134,
              title: 'Dune: Part Two',
              posterUrl: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
              rating: 8.3,
            }}
            onPress={() => toast.show({ message: 'Selected Dune: Part Two', tone: 'neutral' })}
          />

          <MovieCard
            width={(width - space[4] * 2 - space[3] * 2) / 3}
            movie={{
              id: 872585,
              title: 'Oppenheimer',
              posterUrl: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
              rating: 8.9,
            }}
            comingSoonDate="24 Oct"
            onPress={() => toast.show({ message: 'Selected Oppenheimer', tone: 'neutral' })}
          />

          <MovieCardSkeleton width={(width - space[4] * 2 - space[3] * 2) / 3} />
        </View>
      </Section>

      {/* 9. Empty State */}
      <Section title="9. Empty State">
        <Card variant="outlined">
          <EmptyState
            icon="ticket-outline"
            title="No Bookings Yet"
            message="You don't have any upcoming cinema tickets. Browse now-playing films to book your seats."
            actionLabel="Browse Movies"
            onAction={() => toast.show({ message: 'Navigating to movies...', tone: 'info' })}
          />
        </Card>
      </Section>

      {/* 10. Dialog & BottomSheet Triggers */}
      <Section title="10. Overlays & Toasts">
        <View style={styles.rowWrap}>
          <Button
            label="Open Dialog"
            variant="outline"
            onPress={() => setDialogVisible(true)}
          />

          <Button
            label="Open BottomSheet"
            variant="outline"
            onPress={() => setSheetVisible(true)}
          />

          <Button
            label="Success Toast"
            variant="secondary"
            onPress={() => toast.show({ message: 'Payment confirmed! Tickets issued.', tone: 'success' })}
          />

          <Button
            label="Error Toast"
            variant="destructive"
            onPress={() => toast.show({ message: 'Seats were taken by another user.', tone: 'error', actionLabel: 'Retry', onAction: () => {} })}
          />
        </View>
      </Section>

      {/* 11. SeatMap Interactive Component */}
      <Section title="11. SeatMap (Hall Preview with Pan & Zoom)">
        <Text variant="caption" color="onSurfaceVariant" style={{ marginBottom: space[2] }}>
          Selected: {selectedSeats.size} seats. Pinch to zoom, drag to pan.
        </Text>
        <SeatMap
          seats={MOCK_HALL}
          selectedIds={selectedSeats}
          availableWidth={width - space[4] * 2}
          onToggle={(seat, next) =>
            setSelectedSeats((prev) => {
              const n = new Set(prev);
              if (next) n.add(seat.id);
              else n.delete(seat.id);
              return n;
            })
          }
        />
      </Section>

      {/* 12. Ticket QR Token */}
      <Section title="12. Signed Ticket QR Code">
        <TicketQr
          token="matinee://ticket/bkg_demo_8a12b?sig=c4ca4238a0b923820dcc509a6f75849b"
          label="Admit One: Dune Part Two, Screen 1, Seat B12"
        />
      </Section>

      {/* 13. Confirmation Celebration */}
      <Section title="13. Confirmation Celebration (Success Motion & Haptics)">
        <Card variant="filled">
          <ConfirmationCelebration
            key={celebrationKey}
            title="Booking Confirmed!"
            subtitle="Seats locked & HMAC-signed QR ticket issued."
          />
          <Button
            label="Replay Celebration Animation"
            variant="secondary"
            size="md"
            onPress={() => setCelebrationKey((k) => k + 1)}
            style={{ marginTop: space[4], alignSelf: 'center' }}
          />
        </Card>
      </Section>

      {/* 14. Accessible Seat List Picker */}
      <Section title="14. Accessible Seat List Picker (TalkBack & Screen Readers)">
        <Card variant="outlined" style={{ gap: space[3] }}>
          <Text variant="body" color="onSurface">
            Provides a WCAG AAA compliant list-based selection alternative to the 2D pan/zoom seat canvas.
            Features 52 dp touch targets, grouped by row with explicit availability status announcements.
          </Text>
          <Text variant="label" color="onSurfaceVariant">
            Currently selected seats: {selectedSeats.size > 0 ? Array.from(selectedSeats).join(', ') : 'None'}
          </Text>
          <Button
            label="Open Accessible Seat Picker"
            variant="primary"
            size="md"
            onPress={() => setListPickerVisible(true)}
          />
        </Card>
      </Section>

      {/* Modals rendered outside content flow */}
      <SeatListPicker
        visible={listPickerVisible}
        onClose={() => setListPickerVisible(false)}
        seats={MOCK_HALL}
        selectedIds={selectedSeats}
        onToggle={(seat, next) =>
          setSelectedSeats((prev) => {
            const n = new Set(prev);
            if (next) n.add(seat.id);
            else n.delete(seat.id);
            return n;
          })
        }
      />
      <Dialog
        visible={dialogVisible}
        title="Cancel Showtime?"
        message="This action will refund every paid ticket in this session and notify attendees. Cannot be undone."
        confirmLabel="Cancel Showtime"
        destructive
        onConfirm={() => {
          setDialogVisible(false);
          toast.show({ message: 'Showtime cancelled and refunds queued', tone: 'warning' });
        }}
        onDismiss={() => setDialogVisible(false)}
      />

      <BottomSheet
        visible={sheetVisible}
        title="Order Summary"
        onDismiss={() => setSheetVisible(false)}
      >
        <View style={{ gap: space[3], paddingVertical: space[2] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="body" color="onSurface">
              Dune: Part Two (Standard x 2)
            </Text>
            <Text variant="label" color="onSurface">
              NGN 9,000
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="body" color="onSurfaceVariant">
              Service Fee (10%)
            </Text>
            <Text variant="label" color="onSurfaceVariant">
              NGN 900
            </Text>
          </View>
          <View
            style={{
              height: 1,
              backgroundColor: colors.outlineVariant,
              marginVertical: space[1],
            }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="title3" color="primary">
              Total
            </Text>
            <Text variant="title3" color="primary">
              NGN 9,900
            </Text>
          </View>
          <Button
            label="Proceed to Payment"
            size="lg"
            fullWidth
            onPress={() => {
              setSheetVisible(false);
              toast.show({ message: 'Redirecting to Paystack...', tone: 'success' });
            }}
            style={{ marginTop: space[3] }}
          />
        </View>
      </BottomSheet>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text variant="title2" color="primary" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={[styles.sectionDivider, { backgroundColor: colors.outlineVariant }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: space[4],
    gap: space[6],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: space[2],
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  section: {
    gap: space[3],
  },
  sectionTitle: {
    letterSpacing: -0.25,
  },
  sectionDivider: {
    height: 1,
    marginBottom: space[1],
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[3],
  },
  swatchItem: {
    width: 75,
    gap: 2,
  },
  swatchColor: {
    width: 75,
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  typoList: {
    gap: space[3],
  },
  typoItem: {
    gap: 2,
  },
  typoLabel: {
    textTransform: 'uppercase',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    alignItems: 'center',
  },
});
