import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { donationsApi, type CreateDonationPayload } from '@/api/donations.api';
import { queryClient } from '@/api/queryClient';
import { UrgentCountdown } from '@/components/UrgentCountdown';
import { Button, Card, Screen, Stepper } from '@/components/ui';
import { useDonationDraft } from '@/store/donationDraft.store';
import { colors, spacing, typography } from '@/theme';
import { formatDateTime } from '@/utils/date';

/** FR2, FR3 — step 3 of 3: confirm and submit for admin approval (FR4). */
export default function Step3Review() {
  const { t } = useTranslation();
  const { draft, isComplete, reset } = useDonationDraft();

  const submit = useMutation({
    mutationFn: () => donationsApi.create(draft as CreateDonationPayload),
    async onSuccess() {
      reset();
      await queryClient.invalidateQueries({ queryKey: ['donor.donations'] });
      router.replace('/(donor)/post-donation/success');
    },
  });

  return (
    <Screen
      footer={
        <>
          <Button
            label={t('common.submit')}
            disabled={!isComplete()}
            loading={submit.isPending}
            onPress={() => submit.mutate()}
          />
          {Boolean(submit.error) && (
            <Text style={styles.error}>{(submit.error as Error).message}</Text>
          )}
        </>
      }
    >
      <Stepper steps={[t('donor.foodDetails'), t('donor.timing'), t('donor.review')]} current={2} />

      <Card>
        <Text style={styles.title}>{draft.title}</Text>
        <Row label={t('donor.foodType')} value={draft.foodType ?? '—'} />
        <Row label={t('donor.servings')} value={String(draft.servings ?? '—')} />
        <Row
          label={t('donor.cookedAt')}
          value={draft.cookedAt ? formatDateTime(draft.cookedAt) : '—'}
        />
        <Row label={t('donor.safeForHours')} value={`${draft.safeForHours ?? '—'} h`} />
        <Row
          label={t('donor.pickupAddress')}
          value={
            draft.pickupAddress ? `${draft.pickupAddress.line1}, ${draft.pickupAddress.city}` : '—'
          }
        />
        {Boolean(draft.description) && <Text style={styles.notes}>{draft.description}</Text>}
      </Card>

      {draft.cookedAt && draft.safeForHours ? (
        <UrgentCountdown cookedAt={draft.cookedAt} safeForHours={draft.safeForHours} />
      ) : null}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h3, color: colors.text },
  row: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  rowLabel: { ...typography.body, color: colors.textMuted },
  rowValue: { ...typography.bodyStrong, color: colors.text, flexShrink: 1, textAlign: 'right' },
  notes: { ...typography.body, color: colors.textMuted },
  error: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
