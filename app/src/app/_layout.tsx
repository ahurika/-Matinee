import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, useFonts } from '@expo-google-fonts/manrope';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAuthStore } from '@/state/useAuthStore';
import { ToastProvider } from '@/ui/components/Toast';
import { ThemeProvider } from '@/ui/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  const initializeAuth = useAuthStore((s) => s.initialize);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider mode="system">
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="movie/[id]" options={{ presentation: 'card' }} />
              <Stack.Screen name="showtimes/[movieId]" options={{ presentation: 'card' }} />
              <Stack.Screen name="waiting-room/[showtimeId]" options={{ presentation: 'card' }} />
              <Stack.Screen name="seats/[showtimeId]" options={{ presentation: 'card' }} />
              <Stack.Screen name="checkout/[showtimeId]" options={{ presentation: 'card' }} />
              <Stack.Screen name="confirming/[orderId]" options={{ presentation: 'card' }} />
              <Stack.Screen name="ticket/[bookingId]" options={{ presentation: 'card' }} />
              <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
              <Stack.Screen name="gallery" options={{ presentation: 'card' }} />
            </Stack>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
