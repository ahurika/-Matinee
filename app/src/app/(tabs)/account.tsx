import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/state/useAuthStore';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { Dialog } from '@/ui/components/Dialog';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';
import { useTheme } from '@/ui/theme';
import { space } from '@/ui/tokens';

export default function AccountScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const { user, isAuthenticated, logout } = useAuthStore();
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + space[3],
        paddingBottom: space[8],
        paddingHorizontal: space[4],
      }}
    >
      <View style={styles.header}>
        <Text variant="title1" color="onSurface">
          Account
        </Text>
      </View>

      {/* User Info Card */}
      <Card variant="filled" style={styles.card}>
        <View style={styles.userRow}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primaryContainer }]}>
            <MaterialCommunityIcons
              name="account"
              size={32}
              color={colors.onPrimaryContainer}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text variant="title3" color="onSurface">
              {isAuthenticated ? user?.email : 'Guest Customer'}
            </Text>
            <Text variant="caption" color="onSurfaceVariant">
              {isAuthenticated ? 'Verified Account' : 'Sign in to access tickets & faster checkout'}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: space[4] }}>
          {isAuthenticated ? (
            <Button
              label="Log Out"
              variant="outline"
              onPress={() => setLogoutDialogVisible(true)}
            />
          ) : (
            <Button
              label="Sign In or Register"
              variant="primary"
              onPress={() => router.push('/auth')}
            />
          )}
        </View>
      </Card>

      {/* App Preferences */}
      <View style={styles.sectionHeader}>
        <Text variant="title3" color="onSurface">
          Appearance & Theme
        </Text>
      </View>

      <Card variant="outlined" style={styles.card}>
        <Text variant="bodySmall" color="onSurfaceVariant" style={{ marginBottom: space[3] }}>
          Current theme: {isDark ? 'Dark (Cinema Default)' : 'Light'}
        </Text>

        <View style={styles.chipRow}>
          <Chip label="Dark" selected={isDark} />
          <Chip label="Light" selected={!isDark} />
        </View>
      </Card>

      {/* TMDB Attribution Section (Required by TMDB terms) */}
      <View style={styles.sectionHeader}>
        <Text variant="title3" color="onSurface">
          Data Attribution
        </Text>
      </View>

      <Card variant="outlined" style={styles.card}>
        <View style={{ gap: space[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <Image
              source={{ uri: 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc8de971e3e449ac4bce6.png' }}
              style={{ width: 100, height: 20 }}
              contentFit="contain"
              accessibilityLabel="The Movie Database Logo"
            />
          </View>
          <Text variant="bodySmall" color="onSurfaceVariant">
            This product uses the TMDB API but is not endorsed or certified by TMDB. Film artwork,
            synopses, and metadata are provided by TMDB.
          </Text>
        </View>
      </Card>

      {/* App Version & Hidden Living Gallery Trigger */}
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="App version, long press to open component gallery"
          onLongPress={() => {
            toast.show({ message: 'Opening Component Gallery...', tone: 'info' });
            router.push('/gallery');
          }}
          delayLongPress={600}
          hitSlop={12}
        >
          <Text variant="caption" color="onSurfaceVariant" style={styles.versionText}>
            Matinee v1.0.0 (Press & hold for Living Gallery)
          </Text>
        </Pressable>
      </View>

      <Dialog
        visible={logoutDialogVisible}
        title="Log Out?"
        message="You will need to sign back in to view your tickets or book new seats."
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        onConfirm={async () => {
          setLogoutDialogVisible(false);
          await logout();
          toast.show({ message: 'Logged out successfully', tone: 'neutral' });
        }}
        onDismiss={() => setLogoutDialogVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: space[4],
  },
  card: {
    marginBottom: space[4],
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginBottom: space[2],
  },
  chipRow: {
    flexDirection: 'row',
    gap: space[2],
  },
  footer: {
    alignItems: 'center',
    marginTop: space[6],
    marginBottom: space[4],
  },
  versionText: {
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
