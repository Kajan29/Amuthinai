import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from './StatusBadge';
import { UrgentCountdown } from './UrgentCountdown';
import { Card } from './ui/Card';

import { colors, spacing, typography } from '@/theme';
import type { Donation } from '@/types';

interface DonationCardProps {
  donation: Donation;
  onPress?: () => void;
  /** Shown on the volunteer dashboard where travel distance matters (FR7, FR8). */
  distanceKm?: number;
}

export function DonationCard({ donation, onPress, distanceKm }: DonationCardProps) {
  return (
    <Card onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {donation.title}
        </Text>
        <StatusBadge status={donation.status} />
      </View>

      <Text style={styles.meta}>
        {donation.servings} servings · {donation.foodType}
        {distanceKm !== undefined ? ` · ${distanceKm} km away` : ''}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {donation.pickupAddress.line1}, {donation.pickupAddress.city}
      </Text>

      <UrgentCountdown cookedAt={donation.cookedAt} safeForHours={donation.safeForHours} />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  title: { ...typography.h3, color: colors.text, flex: 1 },
  meta: { ...typography.caption, color: colors.textMuted },
});
