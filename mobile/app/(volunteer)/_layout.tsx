import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';
import { chrome, roleTabBarStyle } from '@/theme/chrome';

export default function VolunteerLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <RoleGuard role="volunteer">
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
          name="tasks"
          options={{
            title: t('nav.tasks'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'clipboard' : 'clipboard-outline'} color={color} size={size} />
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
          name="karma"
          options={{
            title: t('nav.impact'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'heart' : 'heart-outline'} color={color} size={size} />
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
        <Tabs.Screen name="assignment/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="pickup/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="delivery/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="raise-concern" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      </Tabs>
    </RoleGuard>
  );
}
