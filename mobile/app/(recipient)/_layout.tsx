import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/theme';

export default function RecipientLayout() {
  const { t } = useTranslation();

  return (
    <RoleGuard role="recipient">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: t('recipient.dashboard'),
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="raise-concern"
          options={{
            title: t('recipient.raiseConcern'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="alert-circle" color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen name="request" options={{ href: null, headerShown: false }} />
      </Tabs>
    </RoleGuard>
  );
}
