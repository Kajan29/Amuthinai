import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { queryClient } from '@/api/queryClient';
import { requestsApi, type CreateRequestPayload } from '@/api/requests.api';
import { Button, Card, Screen, Stepper } from '@/components/ui';
import { useRequestDraft } from '@/store/requestDraft.store';
import { colors, spacing, typography } from '@/theme';
import { formatDateTime } from '@/utils/date';

/** FR5 — step 3 of 3: confirm and submit the request. */
export default function Step3Review() {
  const { t } = useTranslation();
  const { draft, isComplete, reset } = useRequestDraft();

  const submit = useMutation({
    mutationFn: () => requestsApi.create(draft as CreateRequestPayload),
    async onSuccess() {
      reset();
      await queryClient.invalidateQueries({ queryKey: ['recipient.requests'] });
      router.replace('/(recipient)/request/success');
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
      <Stepper
        steps={[t('recipient.location'), t('recipient.details'), t('donor.review')]}
        current={2}
      />

      <Card>
        <Row label={t('recipient.servingsNeeded')} value={String(draft.servingsNeeded ?? '—')} />
        <Row
          label={t('recipient.neededBy')}
          value={draft.neededBy ? formatDateTime(draft.neededBy) : '—'}
        />
        <Row
          label={t('recipient.location')}
          value={draft.dropAddress ? `${draft.dropAddress.line1}, ${draft.dropAddress.city}` : '—'}
        />
        {Boolean(draft.notes) && <Text style={styles.notes}>{draft.notes}</Text>}
      </Card>
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
  row: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  rowLabel: { ...typography.body, color: colors.textMuted },
  rowValue: { ...typography.bodyStrong, color: colors.text, flexShrink: 1, textAlign: 'right' },
  notes: { ...typography.body, color: colors.textMuted },
  error: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
