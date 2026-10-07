import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/theme';

export default function AdminLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <RoleGuard role="admin">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            height: 56 + Math.max(insets.bottom, 8),
            paddingTop: 6,
            paddingBottom: Math.max(insets.bottom, 8),
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: t('admin.dashboard'),
            tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="approvals"
          options={{
            title: t('admin.approvals'),
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="checkmark-done" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="disputes"
          options={{
            title: t('admin.disputes'),
            tabBarIcon: ({ color, size }) => <Ionicons name="warning" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: t('admin.analytics'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart" color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen
          name="assign/[donationId]"
          options={{ href: null, tabBarStyle: { display: 'none' } }}
        />
      </Tabs>
    </RoleGuard>
  );
}
