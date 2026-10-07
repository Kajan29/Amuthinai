import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';
import { donorColors } from '@/theme/donor';

export default function DonorLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <RoleGuard role="donor">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: donorColors.orange,
          tabBarInactiveTintColor: donorColors.muted,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: donorColors.line,
            height: 56 + Math.max(insets.bottom, 8),
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: t('donor.navHome'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="donations"
          options={{
            title: t('donor.navDonations'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: t('donor.navMap'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="rewards"
          options={{
            title: t('donor.navImpact'),
            headerShown: true,
            headerStyle: { backgroundColor: donorColors.background },
            headerShadowVisible: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('donor.navProfile'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen
          name="post-donation"
          options={{ href: null, tabBarStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="donation/[id]"
          options={{
            href: null,
            headerShown: true,
            title: t('donor.navDonations'),
            tabBarStyle: { display: 'none' },
          }}
        />
      </Tabs>
    </RoleGuard>
  );
}
