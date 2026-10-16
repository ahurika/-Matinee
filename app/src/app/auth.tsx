import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/state/useAuthStore';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { Input } from '@/ui/components/Input';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';
import { useTheme } from '@/ui/theme';
import { space } from '@/ui/tokens';

export default function AuthScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login, register } = useAuthStore();

  const isPasswordValid = password.length >= 10;

  const handleSubmit = async () => {
    if (!email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Password must be at least 10 characters');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        toast.show({ message: 'Welcome back!', tone: 'success' });
      } else {
        await register(email.trim(), password);
        toast.show({ message: 'Account created successfully!', tone: 'success' });
      }
      router.back();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + space[4],
            paddingBottom: insets.bottom + space[6],
          },
        ]}
      >
        <View style={styles.topRow}>
          <Button
            label="Close"
            variant="text"
            leading={<MaterialCommunityIcons name="close" size={20} color={colors.primary} />}
            onPress={() => router.back()}
          />
        </View>

        <Card variant="filled" style={styles.authCard}>
          <Text variant="title1" color="onSurface" style={{ textAlign: 'center' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text
            variant="bodySmall"
            color="onSurfaceVariant"
            style={{ textAlign: 'center', marginTop: space[1], marginBottom: space[4] }}
          >
            {mode === 'login'
              ? 'Sign in to access your booked tickets & fast checkout'
              : 'Join Matinee to select and hold cinema seats in real time'}
          </Text>

          {/* Mode Switcher */}
          <View style={styles.modeRow}>
            <Chip
              label="Sign In"
              selected={mode === 'login'}
              onPress={() => {
                setMode('login');
                setErrorMessage(null);
              }}
            />
            <Chip
              label="Create Account"
              selected={mode === 'register'}
              onPress={() => {
                setMode('register');
                setErrorMessage(null);
              }}
            />
          </View>

          <View style={{ gap: space[4] }}>
            <Input
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="you@example.com"
              leading={<MaterialCommunityIcons name="email-outline" size={20} color={colors.onSurfaceVariant} />}
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secure
              placeholder="••••••••••"
              helper={mode === 'register' ? 'Minimum 10 characters required' : undefined}
              leading={<MaterialCommunityIcons name="lock-outline" size={20} color={colors.onSurfaceVariant} />}
            />

            {/* Advisory strength meter for registration */}
            {mode === 'register' && password.length > 0 ? (
              <View style={styles.meterContainer}>
                <View
                  style={[
                    styles.meterBar,
                    {
                      backgroundColor: isPasswordValid ? colors.success : colors.warning,
                      width: isPasswordValid ? '100%' : '50%',
                    },
                  ]}
                />
                <Text variant="caption" color={isPasswordValid ? 'success' : 'warning'}>
                  {isPasswordValid ? 'Strong password' : 'At least 10 characters needed'}
                </Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
                <Text variant="caption" style={{ color: colors.error, flex: 1 }}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <Button
              label={mode === 'login' ? 'Sign In' : 'Create Account'}
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleSubmit}
              style={{ marginTop: space[2] }}
            />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: space[4],
    justifyContent: 'center',
    flexGrow: 1,
  },
  topRow: {
    alignItems: 'flex-end',
    marginBottom: space[2],
  },
  authCard: {
    padding: space[5],
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space[2],
    marginBottom: space[4],
  },
  meterContainer: {
    gap: 4,
  },
  meterBar: {
    height: 4,
    borderRadius: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
});
