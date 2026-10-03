import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TONE_COLORS: Record<Tone, { background: string; text: string }> = {
  neutral: { background: colors.surface, text: colors.textMuted },
  success: { background: '#E4F3E7', text: colors.success },
  warning: { background: '#FCF1DF', text: '#A96C09' },
  danger: { background: '#FBE6E4', text: colors.danger },
  info: { background: '#E5EEF8', text: colors.info },
};

interface BadgeProps {
  label: string;
  tone?: Tone;
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const palette = TONE_COLORS[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: { ...typography.caption, fontWeight: '600' },
});
