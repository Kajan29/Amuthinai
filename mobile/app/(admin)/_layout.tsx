import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';
import { chrome, roleTabBarStyle } from '@/theme/chrome';

export default function AdminLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <RoleGuard role="admin">
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
          name="approvals"
          options={{
            title: t('nav.approvals'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'}
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="deliveries"
          options={{
            title: t('nav.deliveries'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'cube' : 'cube-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: t('nav.analytics'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('nav.profile'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen name="recipients" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="map" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="disputes" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="assign/[donationId]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      </Tabs>
    </RoleGuard>
  );
}
