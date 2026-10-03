import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Input, Screen, Stepper } from '@/components/ui';
import { useRequestDraft } from '@/store/requestDraft.store';
import { colors, radius, spacing, typography } from '@/theme';

/** "Needed within N hours" shortcuts, converted to an absolute timestamp on selection. */
const NEEDED_WITHIN_HOURS = [2, 4, 8, 24];

/** FR5 — step 2 of 3: how much food is needed and by when. */
export default function Step2Details() {
  const { t } = useTranslation();
  const { draft, update } = useRequestDraft();

  const canContinue = Boolean((draft.servingsNeeded ?? 0) > 0 && draft.neededBy);

  return (
    <Screen
      footer={
        <Button
          label={t('common.next')}
          disabled={!canContinue}
          onPress={() => router.push('/(recipient)/request/step3-review')}
        />
      }
    >
      <Stepper
        steps={[t('recipient.location'), t('recipient.details'), t('donor.review')]}
        current={1}
      />

      <Input
        label={t('recipient.servingsNeeded')}
        value={draft.servingsNeeded ? String(draft.servingsNeeded) : ''}
        onChangeText={(value) =>
          update({ servingsNeeded: Number(value.replace(/\D/g, '')) || undefined })
        }
        keyboardType="number-pad"
        hint="How many people will eat?"
      />

      <View style={styles.group}>
        <Text style={styles.label}>{t('recipient.neededBy')}</Text>
        <View style={styles.chips}>
          {NEEDED_WITHIN_HOURS.map((hours) => {
            const neededBy = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
            const isSelected = draft.neededBy === neededBy;

            return (
              <Pressable
                key={hours}
                onPress={() => update({ neededBy })}
                style={[styles.chip, isSelected && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>
                  Within {hours}h
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Input
        label="Notes"
        value={draft.notes ?? ''}
        onChangeText={(notes) => update({ notes })}
        multiline
        numberOfLines={3}
        hint="Dietary needs, number of children, access instructions."
      />
    </Screen>
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
  chipLabel: { ...typography.caption, color: colors.textMuted },
  chipLabelActive: { color: colors.primaryDark, fontWeight: '600' },
});
