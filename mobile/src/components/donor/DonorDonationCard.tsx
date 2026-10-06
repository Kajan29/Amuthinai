import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DonorDashboardDonation } from '@/api/donations.api';
import { donorColors } from '@/theme/donor';
import { formatTime } from '@/utils/date';

interface DonorDonationCardProps {
  donation: DonorDashboardDonation;
  onPress: () => void;
}

export function DonorDonationCard({ donation, onPress }: DonorDonationCardProps) {
  const { t } = useTranslation();
  const time = formatTime(donation.cookedAt);
  const delivered = donation.status === 'delivered';
  const tracking = Boolean(donation.volunteer);
  const expiring = !delivered && !tracking && donation.expiresInMinutes !== null;
  const showRiders = !delivered && !tracking && donation.ridersPinged > 0;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
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
        </View>

        <Ionicons name="chevron-forward" size={18} color="#C4BDB6" />
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

      {expiring || showRiders ? (
        <View style={styles.footer}>
          {expiring ? (
            <View style={styles.expiry}>
              <Ionicons name="time" size={14} color={donorColors.orange} />
              <Text style={styles.expiryText}>
                {t('donor.autoExpires', { minutes: donation.expiresInMinutes })}
              </Text>
            </View>
          ) : (
            <View style={styles.expiry} />
          )}
          {showRiders ? (
            <Text style={styles.riders}>
              {t('donor.ridersPinged', { count: donation.ridersPinged })}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!delivered && !tracking && !expiring && !showRiders && donation.status === 'pending_approval' ? (
        <View style={styles.footer}>
          <Text style={styles.waiting}>{t('donor.waitingReview')}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: donorColors.card,
    borderRadius: 18,
    elevation: 2,
    gap: 12,
    padding: 12,
    shadowColor: '#3A2A22',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
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
  track: {
    borderColor: donorColors.plum,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  trackLabel: { color: donorColors.plum, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  expiry: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 6 },
  expiryText: { color: donorColors.orange, flex: 1, fontSize: 12, fontWeight: '700' },
  riders: { color: donorColors.muted, fontSize: 12 },
  delivered: { color: donorColors.muted, flex: 1, fontSize: 12 },
  karma: { color: donorColors.orange, fontSize: 13, fontWeight: '800' },
  waiting: { color: donorColors.muted, fontSize: 12 },
});
