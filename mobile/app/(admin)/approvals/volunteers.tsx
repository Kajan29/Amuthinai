import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { adminApi } from '@/api/admin.api';
import { queryClient } from '@/api/queryClient';
import { Button, Card, EmptyState, Screen } from '@/components/ui';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { colors, spacing, typography } from '@/theme';

/** Volunteer verification — unverified volunteers receive no assignment offers. */
export default function VerifyVolunteers() {
  const { t } = useTranslation();
  const volunteers = useOfflineQuery('admin.unverifiedVolunteers', () =>
    adminApi.unverifiedVolunteers(),
  );

  const verify = useMutation({
    mutationFn: (id: string) => adminApi.verifyVolunteer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin.unverifiedVolunteers'] }),
  });

  const items = volunteers.data?.items ?? [];

  return (
    <Screen>
      {items.length === 0 ? (
        <EmptyState title="No volunteers waiting" description="Every volunteer is verified." />
      ) : (
        items.map((volunteer) => (
          <Card key={volunteer.id}>
            <View style={styles.row}>
              <View style={styles.details}>
                <Text style={styles.name}>{volunteer.name}</Text>
                <Text style={styles.meta}>{volunteer.phone}</Text>
                <Text style={styles.meta}>
                  {volunteer.vehicleType ?? 'no vehicle set'} · {volunteer.travelRadiusKm ?? 0} km
                  radius
                </Text>
              </View>
            </View>
            <Button
              label={t('admin.approve')}
              loading={verify.isPending && verify.variables === volunteer.id}
              onPress={() => verify.mutate(volunteer.id)}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  details: { flex: 1, gap: 2 },
  name: { ...typography.bodyStrong, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted, textTransform: 'capitalize' },
});
