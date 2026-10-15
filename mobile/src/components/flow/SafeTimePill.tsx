import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { URGENT_THRESHOLD_MINUTES } from '@/constants';
import { useCountdown } from '@/hooks/useCountdown';

interface SafeTimePillProps {
  expiresAt: string;
  /** Hides the "Urgent" prefix, for tight rows that already show an urgent tag. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** FR3 — live remaining safe time; turns amber inside the urgent window and red once over. */
export function SafeTimePill({ expiresAt, compact = false, style }: SafeTimePillProps) {
  const { t } = useTranslation();
  const { minutesLeft, isExpired } = useCountdown(expiresAt);
  const urgent = !isExpired && minutesLeft <= URGENT_THRESHOLD_MINUTES;
  const tone = isExpired ? TONES.expired : urgent ? TONES.urgent : TONES.fresh;

  const hours = Math.floor(Math.max(minutesLeft, 0) / 60);
  const minutes = Math.max(minutesLeft, 0) % 60;
  const span = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const label = isExpired
    ? t('flow.safeExpired')
    : urgent && !compact
      ? `${t('flow.urgent')} · ${t('flow.safeLeft', { time: span })}`
      : t('flow.safeLeft', { time: span });

  return (
    <View style={[styles.pill, { backgroundColor: tone.bg, borderColor: tone.border }, style]}>
      <Ionicons
        name={isExpired ? 'alert-circle' : urgent ? 'flame' : 'time-outline'}
        size={12}
        color={tone.text}
      />
      <Text style={[styles.text, { color: tone.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const TONES = {
  fresh: { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857' },
  urgent: { bg: '#FFF7ED', border: '#FDBA74', text: '#C2410C' },
  expired: { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C' },
} as const;

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  text: { fontSize: 11, fontWeight: '800' },
});
