import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { RequestTrackingInfo } from '@/api/requests.api';
import { DeliveryPinCard } from '@/components/DeliveryPinCard';
import type { Address } from '@/types';

import { DonationProgress } from './DonationProgress';
import { SafeTimePill } from './SafeTimePill';
import { deliveryMethodMeta, methodOfMode } from './deliveryMethods';

const MAROON = '#5A1626';
const LIVE_STATUSES = ['pending_approval', 'approved', 'assigned', 'picked_up', 'in_transit'];

function addressLine(address?: Address | null) {
  if (!address) return '';
  return [address.line1, address.city, address.district].filter(Boolean).join(', ');
}

/**
 * Recipient view of a matched donation: progress, how it will reach them, their handover
 * code and who to meet. Works for volunteer delivery and both in-person handovers.
 */
export function RecipientDeliveryCard({ info }: { info?: RequestTrackingInfo | null }) {
  const { t } = useTranslation();
  const donation = info?.donation;

  if (!donation) {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name="hourglass-outline" size={18} color={MAROON} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('flow.waitingDonor')}</Text>
            <Text style={styles.hint}>{t('flow.waitingDonorHint')}</Text>
          </View>
        </View>
      </View>
    );
  }

  const mode = info?.assignment ? (info.mode ?? 'volunteer') : null;
  const method = deliveryMethodMeta(mode ? methodOfMode(mode) : info?.deliveryMethod);
  const confirmed = Boolean(mode) || Boolean(info?.deliveryMethodConfirmed);
  const live = LIVE_STATUSES.includes(donation.status);
  const pin = info?.assignment?.deliveryPin;
  const pinHint =
    mode === 'recipient_pickup'
      ? t('flow.yourCodePickupHint')
      : mode === 'donor_delivery'
        ? t('flow.yourCodeDeliveryHint')
        : t('flow.yourCodeVolunteerHint');

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{t('flow.lifecycle')}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {donation.title}
          </Text>
        </View>
        <View style={styles.statusChip}>
          <Text style={styles.statusText}>{t(`status.${donation.status}`)}</Text>
        </View>
      </View>

      {live && donation.expiresAt ? <SafeTimePill expiresAt={donation.expiresAt} /> : null}

      <DonationProgress status={donation.status} accent={MAROON} />

      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name={method?.icon ?? 'help-outline'} size={18} color={MAROON} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{t('flow.deliveredHow')}</Text>
          <Text style={styles.title}>{method ? t(method.labelKey) : t('flow.methodPending')}</Text>
          <Text style={styles.hint}>
            {confirmed && method ? t(method.hintKey) : t('flow.adminConfirms')}
          </Text>
        </View>
      </View>

      {pin ? (
        <DeliveryPinCard pin={pin} label={t('flow.yourCode')} hint={pinHint} />
      ) : live ? (
        <View style={styles.note}>
          <Ionicons name="lock-closed-outline" size={14} color="#9A3412" />
          <Text style={styles.noteText}>{t('flow.codeComing')}</Text>
        </View>
      ) : null}

      {mode === 'recipient_pickup' && info?.donor ? (
        <PersonRow
          icon="storefront-outline"
          kicker={t('flow.collectFrom')}
          name={info.donor.name}
          detail={addressLine(info.donor.pickupAddress) || t('flow.pickupAddress')}
          phone={info.donor.phone}
          callLabel={t('flow.callDonor')}
        />
      ) : null}

      {mode === 'donor_delivery' && info?.donor ? (
        <PersonRow
          icon="car-outline"
          kicker={t('flow.donorBringing')}
          name={info.donor.name}
          detail={addressLine(info.request.dropAddress)}
          phone={info.donor.phone}
          callLabel={t('flow.callDonor')}
        />
      ) : null}

      {mode === 'volunteer' && info?.volunteer ? (
        <PersonRow
          icon="bicycle-outline"
          kicker={t('flow.methodVolunteer')}
          name={info.volunteer.name}
          detail={[
            info.volunteer.vehicleType,
            info.etaMinutes != null ? t('flow.eta', { minutes: info.etaMinutes }) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          phone={info.volunteer.phone}
          callLabel={t('flow.callRecipient')}
        />
      ) : null}

      <Text style={styles.foot}>{t('flow.verificationRequired')}</Text>
    </View>
  );
}

function PersonRow({
  icon,
  kicker,
  name,
  detail,
  phone,
  callLabel,
}: {
  icon: 'storefront-outline' | 'car-outline' | 'bicycle-outline';
  kicker: string;
  name: string;
  detail?: string;
  phone?: string | null;
  callLabel: string;
}) {
  return (
    <View style={styles.person}>
      <View style={[styles.icon, { backgroundColor: '#ECFDF5' }]}>
        <Ionicons name={icon} size={18} color="#0F7B4F" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.title}>{name}</Text>
        {detail ? <Text style={styles.hint}>{detail}</Text> : null}
      </View>
      {phone ? (
        <Pressable
          style={styles.call}
          onPress={() => Linking.openURL(`tel:${phone}`)}
          accessibilityRole="button"
          accessibilityLabel={callLabel}
        >
          <Ionicons name="call" size={16} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#ECE7E1',
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    marginBottom: 14,
    padding: 16,
  },
  headRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  icon: {
    alignItems: 'center',
    backgroundColor: '#F8EEF0',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  kicker: { color: '#9A928A', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { color: '#1F1A17', fontSize: 15, fontWeight: '800', marginTop: 1 },
  hint: { color: '#6B625B', fontSize: 12, lineHeight: 17, marginTop: 2 },
  statusChip: { backgroundColor: '#F8EEF0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { color: MAROON, fontSize: 11, fontWeight: '800' },
  note: {
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  noteText: { color: '#9A3412', flex: 1, fontSize: 12, fontWeight: '600' },
  person: {
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  call: {
    alignItems: 'center',
    backgroundColor: '#0F7B4F',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  foot: { color: '#9A928A', fontSize: 11, textAlign: 'center' },
});
