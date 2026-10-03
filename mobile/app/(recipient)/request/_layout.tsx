import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function RequestLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="step1-location" options={{ title: t('recipient.location') }} />
      <Stack.Screen name="step2-details" options={{ title: t('recipient.details') }} />
      <Stack.Screen name="step3-review" options={{ title: t('donor.review') }} />
      <Stack.Screen name="success" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}
