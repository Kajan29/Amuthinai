import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { adminApi } from '@/api/admin.api';
import { donationsApi } from '@/api/donations.api';
import { queryClient } from '@/api/queryClient';
import { UrgentCountdown } from '@/components/UrgentCountdown';
import { Button, Card, Input, Screen } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDateTime } from '@/utils/date';

/** FR4 — review the submitted details, then approve or reject with a reason. */
export default function ReviewDonation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  const donation = useQuery({
    queryKey: ['donation', id],
    queryFn: () => donationsApi.byId(id),
  });

  async function afterDecision() {
    await queryClient.invalidateQueries({ queryKey: ['admin.pendingDonations'] });
    router.back();
  }

  const approve = useMutation({
    mutationFn: () => adminApi.approveDonation(id),
    onSuccess: afterDecision,
  });

  const reject = useMutation({
    mutationFn: () => adminApi.rejectDonation(id, reason.trim()),
    onSuccess: afterDecision,
  });

  if (donation.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!donation.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Donation not found</Text>
      </View>
    );
  }

  const item = donation.data;

  return (
    <>
      <Stack.Screen options={{ title: item.title }} />
      <Screen
        footer={
          <>
            <Button
              label={t('admin.approve')}
              loading={approve.isPending}
              onPress={() => approve.mutate()}
            />
            <Button
              label={t('admin.reject')}
              variant="danger"
              disabled={reason.trim().length < 5}
              loading={reject.isPending}
              onPress={() => reject.mutate()}
            />
          </>
        }
      >
        <Card>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.servings} servings · {item.foodType}
          </Text>
          <Text style={styles.meta}>Cooked at {formatDateTime(item.cookedAt)}</Text>
          <UrgentCountdown cookedAt={item.cookedAt} safeForHours={item.safeForHours} />
        </Card>

        {item.photoUrls.length > 0 && (
          <View style={styles.photos}>
            {item.photoUrls.map((url) => (
              <Image key={url} source={{ uri: url }} style={styles.photo} />
            ))}
          </View>
        )}

        <Card>
          <Text style={styles.sectionTitle}>Pickup</Text>
          <Text style={styles.meta}>
            {item.pickupAddress.line1}, {item.pickupAddress.city}
          </Text>
          {Boolean(item.description) && <Text style={styles.notes}>{item.description}</Text>}
        </Card>

        <Input
          label={t('admin.rejectionReason')}
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          hint="Required only when rejecting — the donor sees this text."
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  title: { ...typography.h3, color: colors.text },
  sectionTitle: { ...typography.bodyStrong, color: colors.text },
  meta: { ...typography.body, color: colors.textMuted },
  notes: { ...typography.body, color: colors.text, marginTop: spacing.xs },
  error: { ...typography.body, color: colors.danger },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { borderRadius: radius.md, height: 110, width: 110 },
});
