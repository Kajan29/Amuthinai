import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';
import { chrome, roleTabBarStyle } from '@/theme/chrome';

export default function RecipientLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <RoleGuard role="recipient">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: chrome.accent,
          tabBarInactiveTintColor: chrome.muted,
          tabBarStyle: roleTabBarStyle(bottomPadding),
          tabBarItemStyle: { justifyContent: 'center', paddingVertical: 2 },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: t('nav.home'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="requests"
          options={{
            title: t('nav.requests'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="hub-map"
          options={{
            title: t('nav.map'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'map' : 'map-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="impact"
          options={{
            title: t('nav.impact'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('nav.profile'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen name="raise-concern" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="request" options={{ href: null, headerShown: false }} />
      </Tabs>
    </RoleGuard>
  );
}
