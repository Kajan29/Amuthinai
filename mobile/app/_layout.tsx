import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/i18n';

import { queryClient } from '@/api/queryClient';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { useAuthStore } from '@/store/auth.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useLanguageStore } from '@/store/language.store';
import { colors } from '@/theme';
import { configureGoogleSignIn } from '@/utils/googleAuth';

function PushRegistration() {
  usePushRegistration();
  return null;
}

export default function RootLayout() {
  const restoreAuth = useAuthStore((state) => state.restore);
  const restoreOnboarding = useOnboardingStore((state) => state.restore);
  const restoreLanguage = useLanguageStore((state) => state.restore);

  // Rehydrate the stored session, onboarding state, and language before the first screen paints.
  useEffect(() => {
    void restoreAuth();
    void restoreOnboarding();
    void restoreLanguage();
    // Initialize Google Sign-In
    configureGoogleSignIn();
  }, [restoreAuth, restoreOnboarding, restoreLanguage]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PushRegistration />
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: '600' },
              contentStyle: { backgroundColor: colors.surface },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(donor)" options={{ headerShown: false }} />
            <Stack.Screen name="(volunteer)" options={{ headerShown: false }} />
            <Stack.Screen name="(recipient)" options={{ headerShown: false }} />
            <Stack.Screen name="(admin)" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
