import { Stack } from 'expo-router';

import { stackPushTransition, stackSuccessTransition } from '@/theme/transitions';

export default function RequestLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...stackPushTransition }}>
      <Stack.Screen name="step1-location" />
      <Stack.Screen name="step2-details" />
      <Stack.Screen name="step3-review" />
      <Stack.Screen name="success" options={stackSuccessTransition} />
    </Stack>
  );
}
