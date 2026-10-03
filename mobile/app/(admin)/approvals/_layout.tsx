import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function ApprovalsLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('admin.approvals') }} />
      <Stack.Screen name="donation/[id]" options={{ title: t('admin.approve') }} />
      <Stack.Screen name="volunteers" options={{ title: t('admin.verifyVolunteers') }} />
    </Stack>
  );
}
