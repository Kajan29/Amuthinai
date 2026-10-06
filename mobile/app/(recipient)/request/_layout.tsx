import { Stack } from 'expo-router';

export default function RequestLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="step1-location" />
      <Stack.Screen name="step2-details" />
      <Stack.Screen name="step3-review" />
      <Stack.Screen name="success" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
