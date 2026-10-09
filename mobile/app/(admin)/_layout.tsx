import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';
import { colors } from '@/theme';

export default function AdminLayout() {
  const insets = useSafeAreaInsets();

  return (
    <RoleGuard role="admin">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.adminMaroon,
          tabBarInactiveTintColor: '#8E9A94',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: colors.cardBorder,
            borderTopWidth: 1,
            height: 58 + Math.max(insets.bottom, 8),
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconWrap}>
                <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={22} />
                {focused && <View style={styles.activeDot} />}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="approvals"
          options={{
            title: 'Approvals',
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconWrap}>
                <Ionicons
                  name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  color={color}
                  size={22}
                />
                {focused && <View style={styles.activeDot} />}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="deliveries"
          options={{
            title: 'Deliveries',
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconWrap}>
                <Ionicons name={focused ? 'cube' : 'cube-outline'} color={color} size={22} />
                {focused && <View style={styles.activeDot} />}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconWrap}>
                <Ionicons
                  name={focused ? 'bar-chart' : 'bar-chart-outline'}
                  color={color}
                  size={22}
                />
                {focused && <View style={styles.activeDot} />}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.tabIconWrap}>
                <Ionicons
                  name={focused ? 'person' : 'person-outline'}
                  color={color}
                  size={22}
                />
                {focused && <View style={styles.activeDot} />}
              </View>
            ),
          }}
        />

        {/* Hidden sub-routes */}
        <Tabs.Screen
          name="recipients"
          options={{ href: null, tabBarStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="map"
          options={{ href: null, tabBarStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="disputes"
          options={{ href: null, tabBarStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="assign/[donationId]"
          options={{ href: null, tabBarStyle: { display: 'none' } }}
        />
      </Tabs>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.adminMaroon,
    marginTop: 2,
  },
});
