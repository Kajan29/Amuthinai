import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DonorDashboardDonation } from '@/api/donations.api';
import { SafeTimePill } from '@/components/flow/SafeTimePill';
import { deliveryMethodMeta } from '@/components/flow/deliveryMethods';
import { donorColors } from '@/theme/donor';
import type { DonationStatus } from '@/types';
import { formatTime } from '@/utils/date';

interface DonorDonationCardProps {
  donation: DonorDashboardDonation;
  onPress: () => void;
}

export function DonorDonationCard({ donation, onPress }: DonorDonationCardProps) {
  const { t } = useTranslation();
  const time = formatTime(donation.cookedAt);
  const delivered = donation.status === 'delivered';
  const live = donation.minutesLeft !== null && !delivered;
  const tracking = Boolean(donation.volunteer);
  const showRiders = !delivered && !tracking && donation.ridersPinged > 0;
  const tone = STATUS_TONES[donation.status];
  const method = donation.deliveryMethodConfirmed ? deliveryMethodMeta(donation.deliveryMethod) : null;

  const recipientLine =
    donation.listing === 'request'
      ? donation.recipientName
        ? `${t('flow.recipientLabel')}: ${donation.recipientName}`
        : t('flow.forRequest')
      : live
        ? t('flow.awaitingClaim')
        : t('flow.generalDonation');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        donation.isUrgent && styles.cardUrgent,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        <View style={styles.photo}>
          {donation.photoUrl ? (
            <Image source={{ uri: donation.photoUrl }} style={styles.image} />
          ) : (
            <View style={styles.imageFallback}>
              <Ionicons name="restaurant" size={22} color={donorColors.orange} />
            </View>
          )}
          <View style={styles.qty}>
            <Text style={styles.qtyText}>{donation.quantityLabel}</Text>
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {donation.title}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color={donorColors.alert} />
            <Text style={styles.location} numberOfLines={1}>
              {donation.locationLabel} • {time}
            </Text>
          </View>
          <View style={styles.locationRow}>
            <Ionicons
              name={donation.listing === 'request' ? 'person-outline' : 'people-outline'}
              size={13}
              color={donorColors.plum}
            />
            <Text style={styles.recipient} numberOfLines={1}>
              {recipientLine}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#C4BDB6" />
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.statusChip, { backgroundColor: tone.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: tone.text }]} />
          <Text style={[styles.statusText, { color: tone.text }]}>
            {t(`status.${donation.status}`)}
          </Text>
        </View>
        {live ? <SafeTimePill expiresAt={donation.expiresAt} /> : null}
        {method ? (
          <View style={styles.methodChip}>
            <Ionicons name={method.icon} size={11} color={donorColors.plum} />
            <Text style={styles.methodText} numberOfLines={1}>
              {t(method.labelKey)}
            </Text>
          </View>
        ) : null}
      </View>

      {delivered ? (
        <View style={styles.footer}>
          <Text style={styles.delivered} numberOfLines={1}>
            {donation.deliveredTo
              ? t('donor.deliveredTo', { place: donation.deliveredTo })
              : t('status.delivered')}
          </Text>
          {donation.karmaEarned ? (
            <Text style={styles.karma}>
              {t('donor.karmaEarned', { points: donation.karmaEarned })}
            </Text>
          ) : null}
        </View>
      ) : null}

      {tracking && donation.volunteer ? (
        <View style={styles.footer}>
          <View style={styles.volunteer}>
            <View style={styles.liveDot} />
            <Text style={styles.volunteerText} numberOfLines={1}>
              {t('donor.volunteerAway', {
                name: donation.volunteer.name,
                minutes: donation.volunteer.minutesAway,
              })}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onPress} style={styles.track}>
            <Text style={styles.trackLabel}>{t('donor.track')}</Text>
          </Pressable>
        </View>
      ) : null}

      {donation.awaitingDonorHandover ? (
        <View style={styles.footer}>
          <View style={styles.volunteer}>
            <Ionicons name="keypad" size={14} color={donorColors.orange} />
            <Text style={styles.actionText} numberOfLines={1}>
              {t('flow.handoverTitle')}
            </Text>
          </View>
          <View style={styles.track}>
            <Text style={styles.trackLabel}>{t('donor.track')}</Text>
          </View>
        </View>
      ) : null}

      {showRiders ? (
        <View style={styles.footer}>
          <View style={styles.volunteer} />
          <Text style={styles.riders}>
            {t('donor.ridersPinged', { count: donation.ridersPinged })}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const STATUS_TONES: Record<DonationStatus, { bg: string; text: string }> = {
  pending_approval: { bg: '#FFF4E6', text: '#C47A2A' },
  approved: { bg: '#EEF2FF', text: '#4338CA' },
  assigned: { bg: '#F4E9EC', text: donorColors.plum },
  picked_up: { bg: '#E0F2FE', text: '#0369A1' },
  in_transit: { bg: '#E0F2FE', text: '#0369A1' },
  delivered: { bg: donorColors.greenSoft, text: donorColors.green },
  rejected: { bg: '#FEF2F2', text: '#B91C1C' },
  expired: { bg: '#FEF2F2', text: '#B91C1C' },
  cancelled: { bg: '#F3F0EC', text: donorColors.muted },
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: donorColors.card,
    borderColor: 'transparent',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    gap: 12,
    padding: 12,
    shadowColor: '#3A2A22',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  cardUrgent: { borderColor: '#FDBA74' },
  pressed: { opacity: 0.94 },
  top: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  photo: { borderRadius: 12, height: 64, overflow: 'hidden', width: 64 },
  image: { height: '100%', width: '100%' },
  imageFallback: {
    alignItems: 'center',
    backgroundColor: '#F8E7D2',
    flex: 1,
    justifyContent: 'center',
  },
  qty: {
    backgroundColor: 'rgba(28, 22, 20, 0.72)',
    bottom: 0,
    left: 0,
    paddingVertical: 2,
    position: 'absolute',
    right: 0,
  },
  qtyText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  copy: { flex: 1, gap: 4 },
  title: { color: donorColors.ink, fontSize: 15, fontWeight: '700' },
  locationRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  location: { color: donorColors.muted, flex: 1, fontSize: 12 },
  recipient: { color: donorColors.plum, flex: 1, fontSize: 12, fontWeight: '600' },
  metaRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusChip: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusDot: { borderRadius: 3, height: 6, width: 6 },
  statusText: { fontSize: 11, fontWeight: '800' },
  methodChip: {
    alignItems: 'center',
    backgroundColor: donorColors.iconWell,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  methodText: { color: donorColors.plum, fontSize: 11, fontWeight: '700' },
  footer: {
    alignItems: 'center',
    borderTopColor: donorColors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  volunteer: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 6 },
  liveDot: {
    backgroundColor: donorColors.green,
    borderRadius: 5,
    height: 8,
    width: 8,
  },
  volunteerText: { color: donorColors.green, flex: 1, fontSize: 12, fontWeight: '600' },
  actionText: { color: '#C47A2A', flex: 1, fontSize: 12, fontWeight: '800' },
  track: {
    borderColor: donorColors.plum,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  trackLabel: { color: donorColors.plum, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  riders: { color: donorColors.muted, fontSize: 12 },
  delivered: { color: donorColors.muted, flex: 1, fontSize: 12 },
  karma: { color: donorColors.orange, fontSize: 13, fontWeight: '800' },
});
