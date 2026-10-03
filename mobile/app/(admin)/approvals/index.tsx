import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { adminApi } from '@/api/admin.api';
import { DonationCard } from '@/components/DonationCard';
import { Button, EmptyState, Screen } from '@/components/ui';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';

/** FR4 — queue of donations waiting on an admin decision. */
export default function ApprovalsQueue() {
  const { t } = useTranslation();
  const pending = useOfflineQuery('admin.pendingDonations', () => adminApi.pendingDonations());

  const items = pending.data?.items ?? [];

  return (
    <Screen
      footer={
        <Button
          label={t('admin.verifyVolunteers')}
          variant="ghost"
          onPress={() => router.push('/(admin)/approvals/volunteers')}
        />
      }
    >
      {items.length === 0 ? (
        <EmptyState
          title="Queue is clear"
          description="New donations appear here as soon as donors post them."
        />
      ) : (
        items.map((donation) => (
          <DonationCard
            key={donation.id}
            donation={donation}
            onPress={() => router.push(`/(admin)/approvals/donation/${donation.id}`)}
          />
        ))
      )}
    </Screen>
  );
}
