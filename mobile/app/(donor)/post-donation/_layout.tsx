import { Stack } from 'expo-router';

export default function PostDonationLayout() {
  return (
    <Stack>
      <Stack.Screen name="step1-food" options={{ headerShown: false }} />
      <Stack.Screen name="step2-timing" options={{ headerShown: false }} />
      <Stack.Screen name="step3-review" options={{ headerShown: false }} />
      <Stack.Screen name="success" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}
