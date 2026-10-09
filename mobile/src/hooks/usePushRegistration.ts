import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { usersApi } from '@/api/users.api';
import { addNotificationTapListener, registerForPushNotifications } from '@/services/notifications';
import { useAuthStore } from '@/store/auth.store';

/**
 * Saves this device's Expo push token on the signed-in user so the server can push, and keeps
 * the in-app unread badge fresh when a push arrives or is tapped.
 */
export function usePushRegistration() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || Platform.OS === 'web') return;
    let cancelled = false;

    void (async () => {
      const token = await registerForPushNotifications();
      if (token && !cancelled) {
        await usersApi.update({ pushToken: token }).catch(() => undefined);
      }
    })();

    const subscription = addNotificationTapListener(() => {
      void queryClient.invalidateQueries({ queryKey: ['notifications.unread'] });
      router.push('/notifications' as never);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [userId, queryClient]);
}
