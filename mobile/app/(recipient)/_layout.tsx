import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';

const ACTIVE_COLOR = '#5A1626';
const INACTIVE_COLOR = '#8E8E93';

function TabLabelWithDot({ focused, label }: { focused: boolean; label: string }) {
  return (
    <View style={styles.labelContainer}>
      <Text
        style={[
          styles.labelText,
          { color: focused ? ACTIVE_COLOR : INACTIVE_COLOR, fontWeight: focused ? '700' : '500' },
        ]}
      >
        {label}
      </Text>
      {focused ? <View style={styles.activeDot} /> : <View style={styles.dotPlaceholder} />}
    </View>
  );
}

export default function RecipientLayout() {
  const insets = useSafeAreaInsets();

  return (
    <RoleGuard role="recipient">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          tabBarStyle: [
            styles.tabBar,
            {
              height: 56 + Math.max(insets.bottom, 8),
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ],
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={22} />
            ),
            tabBarLabel: ({ focused }) => <TabLabelWithDot focused={focused} label="Home" />,
          }}
        />
        <Tabs.Screen
          name="requests"
          options={{
            title: 'Requests',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} color={color} size={22} />
            ),
            tabBarLabel: ({ focused }) => <TabLabelWithDot focused={focused} label="Requests" />,
          }}
        />
        <Tabs.Screen
          name="hub-map"
          options={{
            title: 'Hub Map',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'map' : 'map-outline'} color={color} size={22} />
            ),
            tabBarLabel: ({ focused }) => <TabLabelWithDot focused={focused} label="Hub Map" />,
          }}
        />
        <Tabs.Screen
          name="impact"
          options={{
            title: 'Impact',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'pie-chart' : 'pie-chart-outline'}
                color={color}
                size={22}
              />
            ),
            tabBarLabel: ({ focused }) => <TabLabelWithDot focused={focused} label="Impact" />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={22} />
            ),
            tabBarLabel: ({ focused }) => <TabLabelWithDot focused={focused} label="Profile" />,
          }}
        />

        {/* Hidden sub-routes */}
        <Tabs.Screen name="raise-concern" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="request" options={{ href: null, headerShown: false }} />
      </Tabs>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0ECE4',
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  labelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 11,
    marginTop: 2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACTIVE_COLOR,
    marginTop: 3,
  },
  dotPlaceholder: {
    width: 4,
    height: 4,
    marginTop: 3,
  },
});
