import { useMutation } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { assignmentsApi } from '@/api/assignments.api';
import { PhotoCapture } from '@/components/PhotoCapture';
import { Button, Card, Input, Screen } from '@/components/ui';
import { useLocation } from '@/hooks/useLocation';
import { colors, typography } from '@/theme';

const PIN_LENGTH = 4;

/**
 * FR9 — delivery proof. The recipient reads out the PIN from their own screen, which ties
 * the hand-over to a specific person rather than just a timestamp.
 */
export default function ConfirmDelivery() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { point, refresh } = useLocation();

  const [photos, setPhotos] = useState<string[]>([]);
  const [pin, setPin] = useState('');

  const confirm = useMutation({
    mutationFn: async () => {
      const location = point ?? (await refresh());
      if (!location) throw new Error('Location is required to confirm a delivery');

      return assignmentsApi.confirmDelivery(id, { photoUrl: photos[0]!, location, pin });
    },
    onSuccess: () => router.replace('/(volunteer)/dashboard'),
  });

  const canConfirm = photos.length > 0 && pin.length === PIN_LENGTH;

  return (
    <>
      <Stack.Screen options={{ title: t('volunteer.delivery') }} />
      <Screen
        footer={
          <>
            <Button
              label={t('volunteer.delivery')}
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
          <Text style={styles.title}>{t('volunteer.enterPin')}</Text>
          <Input
            label=""
            value={pin}
            onChangeText={(value) => setPin(value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
            keyboardType="number-pad"
            maxLength={PIN_LENGTH}
            placeholder="0000"
          />
        </Card>

        <Card>
          <Text style={styles.title}>Photo of the hand-over</Text>
          <PhotoCapture value={photos} onChange={setPhotos} max={1} cameraOnly />
        </Card>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.bodyStrong, color: colors.text },
  error: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
