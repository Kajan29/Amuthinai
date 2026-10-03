import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PhotoCapture } from '@/components/PhotoCapture';
import { Button, Input, Screen, Stepper } from '@/components/ui';
import { FOOD_TYPES } from '@/constants';
import { useDonationDraft } from '@/store/donationDraft.store';
import { colors, radius, spacing, typography } from '@/theme';
import type { FoodType } from '@/types';

/** FR2 — step 1 of 3: what is being donated. */
export default function Step1Food() {
  const { t } = useTranslation();
  const { draft, update } = useDonationDraft();

  const canContinue = Boolean(draft.title && draft.foodType && (draft.servings ?? 0) > 0);

  return (
    <Screen
      footer={
        <Button
          label={t('common.next')}
          disabled={!canContinue}
          onPress={() => router.push('/(donor)/post-donation/step2-timing')}
        />
      }
    >
      <Stepper steps={[t('donor.foodDetails'), t('donor.timing'), t('donor.review')]} current={0} />

      <Input
        label="What are you donating?"
        value={draft.title ?? ''}
        onChangeText={(title) => update({ title })}
        placeholder="e.g. Rice and curry, 20 portions"
      />

      <View style={styles.group}>
        <Text style={styles.label}>{t('donor.foodType')}</Text>
        <View style={styles.chips}>
          {FOOD_TYPES.map((type) => (
            <FoodTypeChip
              key={type}
              type={type}
              isSelected={draft.foodType === type}
              onSelect={() => update({ foodType: type })}
            />
          ))}
        </View>
      </View>

      <Input
        label={t('donor.servings')}
        value={draft.servings ? String(draft.servings) : ''}
        onChangeText={(value) =>
          update({ servings: Number(value.replace(/\D/g, '')) || undefined })
        }
        keyboardType="number-pad"
      />

      <Input
        label="Notes for the volunteer"
        value={draft.description ?? ''}
        onChangeText={(description) => update({ description })}
        multiline
        numberOfLines={3}
        hint="Allergens, packaging, gate code — anything useful at pickup."
      />

      <View style={styles.group}>
        <Text style={styles.label}>Photos</Text>
        <PhotoCapture
          value={draft.photoUrls ?? []}
          onChange={(photoUrls) => update({ photoUrls })}
        />
      </View>
    </Screen>
  );
}

function FoodTypeChip({
  type,
  isSelected,
  onSelect,
}: {
  type: FoodType;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onSelect}
      style={[styles.chip, isSelected && styles.chipActive]}
    >
      <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>{type}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  label: { ...typography.bodyStrong, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'capitalize' },
  chipLabelActive: { color: colors.primaryDark, fontWeight: '600' },
});
