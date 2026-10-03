import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { requestsApi } from '@/api/requests.api';
import { Button, Card, Input, Screen } from '@/components/ui';
import { colors, typography } from '@/theme';

/** FR12 — a recipient escalates a problem with a delivery to the admin team. */
export default function RaiseConcern() {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const submit = useMutation({
    mutationFn: () => requestsApi.raiseConcern({ subject, body }),
    onSuccess() {
      setSubject('');
      setBody('');
    },
  });

  const canSubmit = subject.trim().length > 2 && body.trim().length > 9;

  return (
    <Screen
      footer={
        <Button
          label={t('common.submit')}
          disabled={!canSubmit}
          loading={submit.isPending}
          onPress={() => submit.mutate()}
        />
      }
    >
      <Card>
        <Text style={styles.title}>{t('recipient.raiseConcern')}</Text>
        <Text style={styles.body}>
          Tell us what went wrong — food quality, a missed delivery or the volunteer&apos;s conduct.
          An admin reviews every concern.
        </Text>
      </Card>

      <Input
        label={t('recipient.concernSubject')}
        value={subject}
        onChangeText={setSubject}
        placeholder="Short summary"
      />
      <Input
        label={t('recipient.concernBody')}
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={6}
        hint="At least 10 characters"
      />

      {submit.isSuccess && <Text style={styles.success}>Sent to the admin team.</Text>}
      {Boolean(submit.error) && <Text style={styles.error}>{(submit.error as Error).message}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h3, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
  success: { ...typography.body, color: colors.success, textAlign: 'center' },
  error: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
