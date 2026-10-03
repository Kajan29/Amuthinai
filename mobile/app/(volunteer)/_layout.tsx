import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/theme';

export default function VolunteerLayout() {
  const { t } = useTranslation();

  return (
    <RoleGuard role="volunteer">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: t('volunteer.dashboard'),
            tabBarIcon: ({ color, size }) => <Ionicons name="map" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="karma"
          options={{
            title: t('volunteer.karma'),
            tabBarIcon: ({ color, size }) => <Ionicons name="leaf" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('volunteer.vehicle'),
            tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
          }}
        />

        {/* Task flow screens are pushed from the dashboard. */}
        <Tabs.Screen name="assignment/[id]" options={{ href: null }} />
        <Tabs.Screen name="pickup/[id]" options={{ href: null }} />
        <Tabs.Screen name="delivery/[id]" options={{ href: null }} />
      </Tabs>
    </RoleGuard>
  );
}
