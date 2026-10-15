import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors } from '@/theme';

/**
 * Configure notification behavior when app is in foreground.
 * Skip on web — expo-notifications does not support push token listeners there.
 */
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

const NOTIFICATIONS_STORAGE_KEY = '@amuthinai_notification_history';

export interface AppNotificationItem {
  id: string;
  title: string;
  body: string;
  type:
    | 'volunteer_assigned'
    | 'tracking_update'
    | 'request_created'
    | 'meal_requested'
    | 'system';
  timestamp: string;
  read: boolean;
  data?: Record<string, any>;
}

/**
 * Register device for push notifications & set up Android channels
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: colors.primary,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('urgent-pickups', {
      name: 'Urgent pickups',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: colors.primary,
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync('tracking-updates', {
      name: 'Live Food Tracking Updates',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: colors.primary,
      sound: 'default',
    });
  }

  try {
    const existing = await Notifications.getPermissionsAsync();
    const granted =
      existing.granted || (await Notifications.requestPermissionsAsync()).granted;

    if (!granted) return null;

    // Expo push tokens need the EAS project id (set via `eas init` → expo.extra.eas.projectId).
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return token.data;
  } catch (error) {
    console.warn('Could not register push notification token:', error);
    return null;
  }
}

/**
 * Send an immediate push notification directly to this device/phone
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  type: AppNotificationItem['type'] = 'system',
  data?: Record<string, any>,
): Promise<string | null> {
  try {
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { ...data, type },
      },
      trigger: null, // null triggers immediately on phone screen
    });

    await saveNotificationToHistory({
      id: notifId || String(Date.now()),
      title,
      body,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      data,
    });

    return notifId;
  } catch (error) {
    console.warn('Failed to schedule local notification:', error);
    return null;
  }
}

/**
 * Persist notification to AsyncStorage history
 */
export async function saveNotificationToHistory(item: AppNotificationItem): Promise<void> {
  try {
    const current = await getNotificationHistory();
    const updated = [item, ...current.filter((n) => n.id !== item.id)].slice(0, 50);
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save notification history:', e);
  }
}

/**
 * Fetch local notification history
 */
export async function getNotificationHistory(): Promise<AppNotificationItem[]> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Mark all notifications in history as read
 */
export async function markNotificationsAsRead(): Promise<void> {
  try {
    const current = await getNotificationHistory();
    const updated = current.map((n) => ({ ...n, read: true }));
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to mark notifications read:', e);
  }
}

/**
 * Helper 1: Notify when a volunteer is assigned
 */
export async function notifyVolunteerAssigned(
  volunteerName: string,
  vehicle: string,
  deliveryLocation: string,
) {
  return sendLocalNotification(
    '🚴 Volunteer Assigned!',
    `${volunteerName} (${vehicle}) has been assigned to deliver food to ${deliveryLocation}.`,
    'volunteer_assigned',
    { volunteerName, vehicle, deliveryLocation },
  );
}

/**
 * Helper 2: Notify tracking process updates
 */
export async function notifyTrackingStatusUpdate(
  stage: 'CONFIRMED' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'ARRIVING' | 'DELIVERED',
  volunteerName?: string,
) {
  const configs: Record<string, { title: string; body: string }> = {
    CONFIRMED: {
      title: '📋 Food Request Confirmed',
      body: 'Your meal request has been confirmed. Relief centers are preparing packages.',
    },
    ASSIGNED: {
      title: '🚴 Volunteer Assigned',
      body: `${volunteerName || 'A volunteer'} has accepted your food delivery.`,
    },
    PICKED_UP: {
      title: '🍲 Food Picked Up from Hub',
      body: `${volunteerName || 'Volunteer'} has collected your meal package from the distribution center.`,
    },
    IN_TRANSIT: {
      title: '🛵 Volunteer On The Way!',
      body: `${volunteerName || 'Volunteer'} is on the way moving towards your pinned delivery point.`,
    },
    ARRIVING: {
      title: '📍 Arriving Soon!',
      body: `${volunteerName || 'Volunteer'} is within 500m of your pinned address.`,
    },
    DELIVERED: {
      title: '✅ Food Delivered Successfully!',
      body: 'Your food has been delivered safely. Thank you for using Amuthinai!',
    },
  };

  const c = configs[stage] || {
    title: 'Delivery Update',
    body: `Your food request status is now ${stage}.`,
  };

  return sendLocalNotification(c.title, c.body, 'tracking_update', { stage, volunteerName });
}

/**
 * Helper 3: Notify when food request is created
 */
export async function notifyFoodRequestPlaced(hubName: string, peopleCount: number) {
  return sendLocalNotification(
    '🍲 Food Request Placed Successfully',
    `Your request for ${peopleCount} people has been submitted to ${hubName}. Matching with nearby volunteers.`,
    'request_created',
    { hubName, peopleCount },
  );
}

/**
 * Helper 4: Notify when request is sent to a meal donor
 */
export async function notifyMealDonationRequested(donorName: string, mealType: string) {
  return sendLocalNotification(
    '📩 Meal Request Sent to Donor',
    `Request for ${mealType} sent to ${donorName}. You will receive a notification once confirmed.`,
    'meal_requested',
    { donorName, mealType },
  );
}

/**
 * Local reminder that a donation's safe window is about to close (FR3)
 */
export async function scheduleFreshnessReminder(
  donationTitle: string,
  fireAt: Date,
): Promise<string | null> {
  const secondsFromNow = Math.floor((fireAt.getTime() - Date.now()) / 1000);
  if (secondsFromNow <= 0) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Food is nearing its safe limit',
      body: `${donationTitle} should be delivered soon.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsFromNow,
    },
  });
}

export function addNotificationTapListener(
  handler: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
