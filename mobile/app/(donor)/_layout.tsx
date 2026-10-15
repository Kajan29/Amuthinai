import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';
import { chrome, roleTabBarStyle } from '@/theme/chrome';
import { tabPushTransition, tabSwitchTransition } from '@/theme/transitions';

export default function DonorLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <RoleGuard role="donor">
      <Tabs
        screenOptions={{
          headerShown: false,
          ...tabSwitchTransition,
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
          name="donations"
          options={{
            title: t('nav.donations'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'cube' : 'cube-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: t('nav.map'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'map' : 'map-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="rewards"
          options={{
            title: t('nav.impact'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'bar-chart' : 'bar-chart-outline'}
                color={color}
                size={size}
              />
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
        <Tabs.Screen
          name="post-donation"
          options={{ href: null, ...tabPushTransition, tabBarStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="donation/[id]"
          options={{
            href: null,
            ...tabPushTransition,
            headerShown: true,
            title: t('nav.donations'),
            tabBarStyle: { display: 'none' },
          }}
        />
      </Tabs>
    </RoleGuard>
  );
}
