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
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="raise-concern"
          options={{
            title: 'Requests',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text" color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen name="request" options={{ href: null, headerShown: false }} />
      </Tabs>
    </RoleGuard>
  );
}
