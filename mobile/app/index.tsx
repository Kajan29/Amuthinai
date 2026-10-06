import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { HOME_ROUTE } from '@/store/auth.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { colors, spacing, typography } from '@/theme';

/** Splash gate: waits for the stored session, then sends the user to their role's home or onboarding. */
export default function Index() {
  const { user, isAuthenticated, isReady: authReady } = useAuth();
  const { hasSeenOnboarding, isReady: onboardingReady } = useOnboardingStore();

  const isReady = authReady && onboardingReady;

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <Text style={styles.title}>Amuthinai</Text>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // First-time users see onboarding
  if (!hasSeenOnboarding) return <Redirect href="/onboarding" />;

  // Authenticated users go to their role's home
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  
  // If user doesn't have a role (legacy accounts), send to select-role
  if (!user?.role) return <Redirect href="/(auth)/select-role" />;

  // User has a role, go to their dashboard
  return <Redirect href={HOME_ROUTE[user.role] as never} />;
}

const styles = StyleSheet.create({
  splash: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  title: { ...typography.h1, color: colors.primary },
});
