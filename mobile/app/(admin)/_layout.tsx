import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/theme';

export default function AdminLayout() {
  const { t } = useTranslation();

  return (
    <RoleGuard role="admin">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
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

        <Tabs.Screen name="assign/[donationId]" options={{ href: null }} />
      </Tabs>
    </RoleGuard>
  );
}
