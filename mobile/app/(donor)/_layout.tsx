import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/theme';

export default function DonorLayout() {
  const { t } = useTranslation();

  return (
    <RoleGuard role="donor">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          headerStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: t('donor.dashboard'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="fast-food" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="rewards"
          options={{
            title: t('donor.karmaPoints'),
            tabBarIcon: ({ color, size }) => <Ionicons name="leaf" color={color} size={size} />,
          }}
        />

        {/* Reached from the dashboard, not from the tab bar. */}
        <Tabs.Screen name="post-donation" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="donation/[id]" options={{ href: null }} />
      </Tabs>
    </RoleGuard>
  );
}
