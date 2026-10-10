import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ProfileScreen } from '@/components/ProfileScreen';

export default function RecipientProfileScreen() {
  const { t } = useTranslation();

  return (
    <ProfileScreen
      role="recipient"
      menuItems={[
        {
          icon: 'alert-circle-outline',
          label: t('recipient.raiseConcern'),
          onPress: () => router.push('/(recipient)/raise-concern'),
          danger: true,
        },
      ]}
    />
  );
}
