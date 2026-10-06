import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { HOME_ROUTE } from '@/store/auth.store';
import { colors } from '@/theme';
import type { Role } from '@/types';

interface RoleGuardProps {
  role: Role;
  children: ReactNode;
}

/**
 * Keeps a route group reachable only by its own role. Mounted in each group layout so a
 * deep link into another role's screens redirects instead of rendering.
 */
export function RoleGuard({ role, children }: RoleGuardProps) {
  const { user, isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!user?.role) return <Redirect href="/(auth)/register" />;
  if (user.role !== role) return <Redirect href={HOME_ROUTE[user.role] as never} />;

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
});
