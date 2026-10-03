import { StyleSheet, Text, View } from 'react-native';

import { Badge } from './ui/Badge';

import { useCountdown } from '@/hooks/useCountdown';
import { colors, radius, spacing, typography } from '@/theme';
import { expiryOf } from '@/utils/freshness';

interface UrgentCountdownProps {
  cookedAt: string;
  /** FR3 — defaults to six hours for cooked food. */
  safeForHours: number;
  compact?: boolean;
}

/** FR3 — live view of the safe-consumption window remaining on a donation. */
export function UrgentCountdown({ cookedAt, safeForHours, compact = false }: UrgentCountdownProps) {
  const expiresAt = expiryOf(cookedAt, safeForHours);
  const { minutesLeft, isExpired, label } = useCountdown(expiresAt);

  const totalMinutes = safeForHours * 60;
  const tone = isExpired ? 'danger' : minutesLeft <= 90 ? 'warning' : 'success';
  const remaining = Math.min(Math.max(minutesLeft / totalMinutes, 0), 1);

  if (compact) return <Badge label={label} tone={tone} />;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.label}>Safe to eat</Text>
        <Badge label={label} tone={tone} />
      </View>
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${remaining * 100}%`, backgroundColor: BAR_COLORS[tone] }]}
        />
      </View>
    </View>
  );
}

const BAR_COLORS = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
} as const;

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...typography.caption, color: colors.textMuted },
  track: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 6,
    overflow: 'hidden',
  },
  fill: { height: 6 },
});
