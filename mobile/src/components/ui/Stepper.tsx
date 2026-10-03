import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

interface StepperProps {
  steps: string[];
  /** Zero-based index of the step being filled in. */
  current: number;
}

/** Progress header for the multi-step donation (FR2) and request (FR5) wizards. */
export function Stepper({ steps, current }: StepperProps) {
  return (
    <View style={styles.row} accessibilityRole="progressbar">
      {steps.map((step, index) => {
        const isDone = index < current;
        const isActive = index === current;

        return (
          <View key={step} style={styles.step}>
            <View
              style={[
                styles.bar,
                (isDone || isActive) && styles.barFilled,
                isDone && styles.barDone,
              ]}
            />
            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  step: { flex: 1, gap: spacing.xs },
  bar: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 4,
  },
  barFilled: { backgroundColor: colors.primary },
  barDone: { backgroundColor: colors.primaryDark },
  label: { ...typography.caption, color: colors.textMuted },
  labelActive: { color: colors.primary, fontWeight: '600' },
});
