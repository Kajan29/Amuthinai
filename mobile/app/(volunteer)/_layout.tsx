import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/RoleGuard';
import { volunteerColors } from '@/theme/volunteer';

const ACTIVE_COLOR = volunteerColors.maroon;
const INACTIVE_COLOR = volunteerColors.muted;

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

export default function VolunteerLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <RoleGuard role="volunteer">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          tabBarStyle: [
            styles.tabBar,
            {
              height: 68 + bottomPadding,
              paddingTop: 6,
              paddingBottom: bottomPadding,
            },
          ],
          tabBarItemStyle: {
            paddingVertical: 2,
            justifyContent: 'center',
          },
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
          name="tasks"
          options={{
            title: 'Tasks',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'clipboard' : 'clipboard-outline'} color={color} size={22} />
            ),
            tabBarLabel: ({ focused }) => <TabLabelWithDot focused={focused} label="Tasks" />,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'map' : 'map-outline'} color={color} size={22} />
            ),
            tabBarLabel: ({ focused }) => <TabLabelWithDot focused={focused} label="Map" />,
          }}
        />
        <Tabs.Screen
          name="karma"
          options={{
            title: 'Impact',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'heart' : 'heart-outline'} color={color} size={22} />
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

        {/* Task flow screens are pushed from the dashboard — hidden from tab bar. */}
        <Tabs.Screen
          name="assignment/[id]"
          options={{ href: null, tabBarStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="pickup/[id]"
          options={{ href: null, tabBarStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="delivery/[id]"
          options={{ href: null, tabBarStyle: { display: 'none' } }}
        />
        <Tabs.Screen
          name="raise-concern"
          options={{ href: null, tabBarStyle: { display: 'none' } }}
        />
      </Tabs>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: volunteerColors.line,
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
