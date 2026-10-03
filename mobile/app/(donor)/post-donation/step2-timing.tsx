import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MapPicker } from '@/components/MapPicker';
import { UrgentCountdown } from '@/components/UrgentCountdown';
import { Button, Input, Screen, Stepper } from '@/components/ui';
import { DEFAULT_SAFE_HOURS } from '@/constants';
import { useDonationDraft } from '@/store/donationDraft.store';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDateTime } from '@/utils/date';

/** Offered safe-consumption windows, in hours (FR3). */
const SAFE_HOUR_OPTIONS = [2, 4, DEFAULT_SAFE_HOURS, 12, 24];

/** Quick "cooked N hours ago" shortcuts so donors do not need a date picker. */
const COOKED_AGO_OPTIONS = [0, 1, 2, 3];

/** FR3 — step 2 of 3: when it was cooked, how long it stays safe, and where to collect it. */
export default function Step2Timing() {
  const { t } = useTranslation();
  const { draft, update } = useDonationDraft();

  const cookedAt = draft.cookedAt;
  const safeForHours = draft.safeForHours ?? DEFAULT_SAFE_HOURS;
  const canContinue = Boolean(cookedAt && draft.pickupAddress?.line1 && draft.pickupAddress?.city);

  function setCookedHoursAgo(hoursAgo: number) {
    update({ cookedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString() });
  }

  return (
    <Screen
      footer={
        <Button
          label={t('common.next')}
          disabled={!canContinue}
          onPress={() => router.push('/(donor)/post-donation/step3-review')}
        />
      }
    >
      <Stepper steps={[t('donor.foodDetails'), t('donor.timing'), t('donor.review')]} current={1} />

      <View style={styles.group}>
        <Text style={styles.label}>{t('donor.cookedAt')}</Text>
        <View style={styles.chips}>
          {COOKED_AGO_OPTIONS.map((hoursAgo) => (
            <Pressable
              key={hoursAgo}
              onPress={() => setCookedHoursAgo(hoursAgo)}
              style={styles.chip}
            >
              <Text style={styles.chipLabel}>
                {hoursAgo === 0 ? 'Just now' : `${hoursAgo}h ago`}
              </Text>
            </Pressable>
          ))}
        </View>
        {Boolean(cookedAt) && (
          <Text style={styles.hint}>Cooked at {formatDateTime(cookedAt!)}</Text>
        )}
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>{t('donor.safeForHours')}</Text>
        <View style={styles.chips}>
          {SAFE_HOUR_OPTIONS.map((hours) => (
            <Pressable
              key={hours}
              onPress={() => update({ safeForHours: hours })}
              style={[styles.chip, safeForHours === hours && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, safeForHours === hours && styles.chipLabelActive]}>
                {hours}h
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {Boolean(cookedAt) && <UrgentCountdown cookedAt={cookedAt!} safeForHours={safeForHours} />}

      <Input
        label={t('donor.pickupAddress')}
        value={draft.pickupAddress?.line1 ?? ''}
        onChangeText={(line1) =>
          update({
            pickupAddress: {
              city: draft.pickupAddress?.city ?? '',
              location: draft.pickupAddress?.location ?? { type: 'Point', coordinates: [0, 0] },
              ...draft.pickupAddress,
              line1,
            },
          })
        }
        placeholder="Street and number"
      />

      <Input
        label="City"
        value={draft.pickupAddress?.city ?? ''}
        onChangeText={(city) =>
          update({
            pickupAddress: {
              line1: draft.pickupAddress?.line1 ?? '',
              location: draft.pickupAddress?.location ?? { type: 'Point', coordinates: [0, 0] },
              ...draft.pickupAddress,
              city,
            },
          })
        }
      />

      <MapPicker
        label="Pickup pin"
        value={draft.pickupAddress?.location ?? null}
        onChange={(location) =>
          update({
            pickupAddress: {
              line1: draft.pickupAddress?.line1 ?? '',
              city: draft.pickupAddress?.city ?? '',
              ...draft.pickupAddress,
              location,
            },
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  label: { ...typography.bodyStrong, color: colors.text },
  hint: { ...typography.caption, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipLabel: { ...typography.caption, color: colors.textMuted },
  chipLabelActive: { color: colors.primaryDark, fontWeight: '600' },
});
