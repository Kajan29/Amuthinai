import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { DonationStatus } from '@/types';

/** The five steps every role sees. `in_transit` sits inside "Collected". */
const STEPS: { key: DonationStatus; reached: DonationStatus[] }[] = [
  {
    key: 'pending_approval',
    reached: ['pending_approval', 'approved', 'assigned', 'picked_up', 'in_transit', 'delivered'],
  },
  { key: 'approved', reached: ['approved', 'assigned', 'picked_up', 'in_transit', 'delivered'] },
  { key: 'assigned', reached: ['assigned', 'picked_up', 'in_transit', 'delivered'] },
  { key: 'picked_up', reached: ['picked_up', 'in_transit', 'delivered'] },
  { key: 'delivered', reached: ['delivered'] },
];

const STOPPED: DonationStatus[] = ['rejected', 'expired', 'cancelled'];

interface DonationProgressProps {
  status: DonationStatus;
  /** Role accent: plum for donors, maroon for recipients/volunteers/admins. */
  accent?: string;
}

/** Pending Approval → Approved → Assigned → Collected → Delivered. */
export function DonationProgress({ status, accent = '#5A1626' }: DonationProgressProps) {
  const { t } = useTranslation();

  if (STOPPED.includes(status)) {
    return (
      <View style={styles.stopped}>
        <Ionicons name="close-circle" size={16} color="#B91C1C" />
        <Text style={styles.stoppedText}>{t(`status.${status}`)}</Text>
      </View>
    );
  }

  const currentIndex = STEPS.reduce(
    (last, step, index) => (step.reached.includes(status) ? index : last),
    0,
  );

  return (
    <View style={styles.row} accessibilityLabel={t(`status.${status}`)}>
      {STEPS.map((step, index) => {
        const done = index < currentIndex || status === 'delivered';
        const current = index === currentIndex && status !== 'delivered';
        const color = done || current ? accent : '#D6D0C8';
        return (
          <View key={step.key} style={styles.step}>
            <View style={styles.trackRow}>
              <View
                style={[styles.line, { backgroundColor: index === 0 ? 'transparent' : index <= currentIndex ? accent : '#E7E1D9' }]}
              />
              <View
                style={[
                  styles.dot,
                  { borderColor: color, backgroundColor: done ? accent : '#FFFFFF' },
                  current && styles.dotCurrent,
                ]}
              >
                {done ? <Ionicons name="checkmark" size={10} color="#FFFFFF" /> : null}
                {current ? <View style={[styles.dotInner, { backgroundColor: accent }]} /> : null}
              </View>
              <View
                style={[
                  styles.line,
                  {
                    backgroundColor:
                      index === STEPS.length - 1 ? 'transparent' : index < currentIndex ? accent : '#E7E1D9',
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.label, (done || current) && { color: '#1F1A17', fontWeight: '800' }]}
              numberOfLines={2}
            >
              {t(`status.${step.key}`)}
            </Text>
            {current && status === 'in_transit' ? (
              <Text style={[styles.sub, { color: accent }]}>{t('status.in_transit')}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  step: { alignItems: 'center', flex: 1 },
  trackRow: { alignItems: 'center', flexDirection: 'row', width: '100%' },
  line: { flex: 1, height: 2 },
  dot: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  dotCurrent: { height: 22, width: 22, borderRadius: 11 },
  dotInner: { borderRadius: 4, height: 8, width: 8 },
  label: {
    color: '#9A928A',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  sub: { fontSize: 9, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  stopped: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stoppedText: { color: '#B91C1C', fontSize: 12, fontWeight: '800' },
});
