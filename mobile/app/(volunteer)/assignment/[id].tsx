import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { assignmentsApi } from '@/api/assignments.api';
import { donationsApi } from '@/api/donations.api';
import { UrgentCountdown } from '@/components/UrgentCountdown';
import { Button, Card, Screen } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

/** Offer detail: accept to take the job, or decline so it can be re-offered. */
export default function AssignmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  const assignment = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => assignmentsApi.byId(id),
  });

  const donation = useQuery({
    queryKey: ['donation', assignment.data?.donationId],
    queryFn: () => donationsApi.byId(assignment.data!.donationId),
    enabled: Boolean(assignment.data?.donationId),
  });

  const accept = useMutation({
    mutationFn: () => assignmentsApi.accept(id),
    onSuccess: () => router.replace(`/(volunteer)/pickup/${id}`),
  });

  const decline = useMutation({
    mutationFn: () => assignmentsApi.decline(id),
    onSuccess: () => router.replace('/(volunteer)/dashboard'),
  });

  if (assignment.isPending || donation.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!assignment.data || !donation.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Assignment not found</Text>
      </View>
    );
  }

  const isOffered = assignment.data.status === 'offered';

  return (
    <>
      <Stack.Screen options={{ title: donation.data.title }} />
      <Screen
        footer={
          isOffered ? (
            <>
              <Button
                label={t('volunteer.accept')}
                loading={accept.isPending}
                onPress={() => accept.mutate()}
              />
              <Button
                label={t('volunteer.decline')}
                variant="ghost"
                loading={decline.isPending}
                onPress={() => decline.mutate()}
              />
            </>
          ) : (
            <Button
              label={t('volunteer.pickup')}
              onPress={() => router.push(`/(volunteer)/pickup/${id}`)}
            />
          )
        }
      >
        <Card>
          <Text style={styles.title}>{donation.data.title}</Text>
          <Text style={styles.meta}>
            {donation.data.servings} servings · {donation.data.foodType}
          </Text>
          <UrgentCountdown
            cookedAt={donation.data.cookedAt}
            safeForHours={donation.data.safeForHours}
          />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Pickup</Text>
          <Text style={styles.meta}>
            {donation.data.pickupAddress.line1}, {donation.data.pickupAddress.city}
          </Text>
          <Text style={styles.meta}>{assignment.data.distanceKm} km from you</Text>
          {Boolean(donation.data.description) && (
            <Text style={styles.notes}>{donation.data.description}</Text>
          )}
        </Card>
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
});
