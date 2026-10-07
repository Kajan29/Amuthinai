import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { adminApi } from '@/api/admin.api';
import { queryClient } from '@/api/queryClient';
import { Badge, Button, Card, EmptyState, Input, Screen } from '@/components/ui';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { colors, spacing, typography } from '@/theme';
import { formatDateTime } from '@/utils/date';

/** FR12 — concerns raised by recipients, resolved with a written outcome. */
export default function Disputes() {
  const { t } = useTranslation();
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  const disputes = useOfflineQuery('admin.disputes', () => adminApi.disputes());

  const resolve = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      adminApi.resolveDispute(id, resolution),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin.disputes'] }),
  });

  const items = disputes.data?.items ?? [];

  return (
    <Screen extraBottomPadding={60}>
      {items.length === 0 ? (
        <EmptyState title="No open disputes" />
      ) : (
        items.map((dispute) => (
          <Card key={dispute.id}>
            <View style={styles.header}>
              <Text style={styles.subject}>{dispute.subject}</Text>
              <Badge
                label={dispute.status.replace('_', ' ')}
                tone={dispute.status === 'resolved' ? 'success' : 'warning'}
              />
            </View>

            <Text style={styles.body}>{dispute.body}</Text>
            <Text style={styles.meta}>{formatDateTime(dispute.createdAt)}</Text>

            {dispute.status === 'resolved' ? (
              <Text style={styles.resolution}>{dispute.resolution}</Text>
            ) : (
              <>
                <Input
                  label="Resolution"
                  value={resolutions[dispute.id] ?? ''}
                  onChangeText={(value) =>
                    setResolutions((previous) => ({ ...previous, [dispute.id]: value }))
                  }
                  multiline
                  numberOfLines={3}
                />
                <Button
                  label={t('common.submit')}
                  disabled={(resolutions[dispute.id] ?? '').trim().length < 5}
                  loading={resolve.isPending && resolve.variables?.id === dispute.id}
                  onPress={() =>
                    resolve.mutate({
                      id: dispute.id,
                      resolution: (resolutions[dispute.id] ?? '').trim(),
                    })
                  }
                />
              </>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  subject: { ...typography.bodyStrong, color: colors.text, flex: 1 },
  body: { ...typography.body, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  resolution: { ...typography.body, color: colors.success },
});
