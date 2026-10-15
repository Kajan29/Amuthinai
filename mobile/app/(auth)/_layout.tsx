import { Stack } from 'expo-router';

import { stackPushTransition } from '@/theme/transitions';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...stackPushTransition }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
