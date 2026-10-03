import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { colors } from '@/theme';

/** FR8 — push alerts for urgent pickups and assignment offers. */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('urgent-pickups', {
      name: 'Urgent pickups',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: colors.primary,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const granted = existing.granted || (await Notifications.requestPermissionsAsync()).granted;

  if (!granted) return null;

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

/** Local reminder that a donation's safe window is about to close (FR3). */
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
