import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { adminApi } from '@/api/admin.api';
import { queryClient } from '@/api/queryClient';
import { Badge, Button, Card, EmptyState, Screen } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

/**
 * FR6, FR7 — ranked volunteer suggestions for one donation. The server scores candidates on
 * distance, travel radius and current workload; the admin confirms or overrides.
 */
export default function AssignVolunteer() {
  const { donationId } = useLocalSearchParams<{ donationId: string }>();
  const { t } = useTranslation();

  const suggestions = useQuery({
    queryKey: ['assign', donationId],
    queryFn: () => adminApi.suggestVolunteers(donationId),
  });

  const assign = useMutation({
    mutationFn: (volunteerId: string) => adminApi.assignVolunteer(donationId, volunteerId),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['admin.pendingDonations'] });
      router.back();
    },
  });

  if (suggestions.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const items = suggestions.data ?? [];

  return (
    <>
      <Stack.Screen options={{ title: t('admin.assign') }} />
      <Screen>
        {items.length === 0 ? (
          <EmptyState
            title="No volunteer in range"
            description="Widen the search or wait for a volunteer to come online."
          />
        ) : (
          items.map((suggestion, index) => (
            <Card key={suggestion.volunteer.id}>
              <View style={styles.header}>
                <Text style={styles.name}>{suggestion.volunteer.name}</Text>
                {index === 0 && <Badge label={t('admin.recommended')} tone="success" />}
              </View>

              <Text style={styles.meta}>
                {suggestion.distanceKm} km away · {suggestion.volunteer.vehicleType ?? 'unknown'}
              </Text>
              <Text style={styles.meta}>
                {suggestion.activeAssignments} active · match score{' '}
                {Math.round(suggestion.score * 100)}%
              </Text>

              <Button
                label={t('admin.assign')}
                variant={index === 0 ? 'primary' : 'ghost'}
                loading={assign.isPending && assign.variables === suggestion.volunteer.id}
                onPress={() => assign.mutate(suggestion.volunteer.id)}
                style={styles.action}
              />
            </Card>
          ))
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  name: { ...typography.h3, color: colors.text, flex: 1 },
  meta: { ...typography.caption, color: colors.textMuted, textTransform: 'capitalize' },
  action: { marginTop: spacing.sm },
});
