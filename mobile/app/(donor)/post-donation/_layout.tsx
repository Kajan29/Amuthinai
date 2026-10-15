import { Stack } from 'expo-router';

import { stackPushTransition, stackSuccessTransition } from '@/theme/transitions';

export default function PostDonationLayout() {
  return (
    <Stack screenOptions={stackPushTransition}>
      <Stack.Screen name="step1-food" options={{ headerShown: false }} />
      <Stack.Screen name="step2-timing" options={{ headerShown: false }} />
      <Stack.Screen name="step3-review" options={{ headerShown: false }} />
      <Stack.Screen name="success" options={{ headerShown: false, ...stackSuccessTransition }} />
    </Stack>
  );
}
