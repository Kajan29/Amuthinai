import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { MapPicker } from '@/components/MapPicker';
import { Button, Input, Screen, Stepper } from '@/components/ui';
import { useLocation } from '@/hooks/useLocation';
import { useRequestDraft } from '@/store/requestDraft.store';
import { colors, typography } from '@/theme';

/** FR5 — step 1 of 3: where the food should be delivered. */
export default function Step1Location() {
  const { t } = useTranslation();
  const { draft, update } = useRequestDraft();
  const { point } = useLocation();

  // Seed the pin with the device position so most recipients only confirm it.
  useEffect(() => {
    if (point && !draft.dropAddress?.location) {
      update({
        dropAddress: {
          line1: draft.dropAddress?.line1 ?? '',
          city: draft.dropAddress?.city ?? '',
          location: point,
        },
      });
    }
  }, [point, draft.dropAddress, update]);

  const address = draft.dropAddress;
  const canContinue = Boolean(address?.line1 && address?.city && address?.location);

  function patchAddress(patch: Partial<NonNullable<typeof address>>) {
    update({
      dropAddress: {
        line1: address?.line1 ?? '',
        city: address?.city ?? '',
        location: address?.location ?? { type: 'Point', coordinates: [0, 0] },
        ...patch,
      },
    });
  }

  return (
    <Screen
      footer={
        <Button
          label={t('common.next')}
          disabled={!canContinue}
          onPress={() => router.push('/(recipient)/request/step2-details')}
        />
      }
    >
      <Stepper
        steps={[t('recipient.location'), t('recipient.details'), t('donor.review')]}
        current={0}
      />

      <Text style={styles.body}>
        Drop a pin as close to the door as you can — volunteers navigate to this point.
      </Text>

      <MapPicker
        value={address?.location ?? null}
        onChange={(location) => patchAddress({ location })}
      />

      <Input
        label="Address"
        value={address?.line1 ?? ''}
        onChangeText={(line1) => patchAddress({ line1 })}
        placeholder="House or building, street"
      />
      <Input
        label="City"
        value={address?.city ?? ''}
        onChangeText={(city) => patchAddress({ city })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...typography.body, color: colors.textMuted },
});
