import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function PostDonationLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="step1-food" options={{ title: t('donor.foodDetails') }} />
      <Stack.Screen name="step2-timing" options={{ title: t('donor.timing') }} />
      <Stack.Screen name="step3-review" options={{ title: t('donor.review') }} />
      <Stack.Screen name="success" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}
