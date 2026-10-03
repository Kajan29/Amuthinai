import { useMutation } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { assignmentsApi } from '@/api/assignments.api';
import { PhotoCapture } from '@/components/PhotoCapture';
import { Button, Card, Screen } from '@/components/ui';
import { useLocation } from '@/hooks/useLocation';
import { colors, typography } from '@/theme';

/**
 * FR9 — pickup proof. The photo must be taken on the spot and is stamped with the device
 * location so the collection point can be verified later.
 */
export default function ConfirmPickup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { point, error: locationError, refresh } = useLocation();

  const [photos, setPhotos] = useState<string[]>([]);

  const confirm = useMutation({
    mutationFn: async () => {
      const location = point ?? (await refresh());
      if (!location) throw new Error('Location is required to confirm a pickup');

      return assignmentsApi.confirmPickup(id, { photoUrl: photos[0]!, location });
    },
    onSuccess: () => router.replace(`/(volunteer)/delivery/${id}`),
  });

  const canConfirm = photos.length > 0;

  return (
    <>
      <Stack.Screen options={{ title: t('volunteer.pickup') }} />
      <Screen
        footer={
          <>
            <Button
              label={t('volunteer.pickup')}
              disabled={!canConfirm}
              loading={confirm.isPending}
              onPress={() => confirm.mutate()}
            />
            {Boolean(confirm.error) && (
              <Text style={styles.error}>{(confirm.error as Error).message}</Text>
            )}
          </>
        }
      >
        <Card>
          <Text style={styles.title}>Photograph the food you collected</Text>
          <Text style={styles.body}>
            One clear photo of the packed food at the donor&apos;s location is enough.
          </Text>
          <PhotoCapture value={photos} onChange={setPhotos} max={1} cameraOnly />
        </Card>

        <Card>
          <Text style={styles.title}>Location stamp</Text>
          <Text style={styles.body}>
            {point
              ? `${point.coordinates[1].toFixed(5)}, ${point.coordinates[0].toFixed(5)}`
              : (locationError ?? t('common.loading'))}
          </Text>
          {Boolean(locationError) && (
            <Button label={t('common.retry')} variant="ghost" onPress={() => void refresh()} />
          )}
        </Card>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.bodyStrong, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
  error: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
