import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { HOME_ROUTE } from '@/store/auth.store';
import { colors, spacing, typography } from '@/theme';

/** Splash gate: waits for the stored session, then sends the user to their role's home. */
export default function Index() {
  const { user, isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <Text style={styles.title}>Amuthinai</Text>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!user?.role) return <Redirect href="/(auth)/select-role" />;

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
