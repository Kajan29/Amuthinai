import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { pointsApi } from '@/api/points.api';
import { DonorShell } from '@/components/donor/DonorShell';
import { EmptyState } from '@/components/ui';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { donorColors } from '@/theme/donor';
import { formatDateTime } from '@/utils/date';

/** FR10 — karma points balance, tier and the ledger that produced it. */
export default function Rewards() {
  const { t } = useTranslation();
  const summary = useOfflineQuery('donor.points', () => pointsApi.summary());
  const entries = summary.data?.entries ?? [];

  return (
    <DonorShell active="impact">
      <View style={styles.root}>
        <Text style={styles.pageTitle}>{t('donor.navImpact')}</Text>

        <View style={styles.hero}>
          <Text style={styles.balance}>{summary.data?.balance ?? 0}</Text>
          <Text style={styles.balanceLabel}>{t('donor.karmaPoints')}</Text>
          {summary.data ? (
            <View style={styles.badges}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{summary.data.tier}</Text>
              </View>
              <View style={[styles.badge, styles.badgeSoft]}>
                <Text style={[styles.badgeText, styles.badgeSoftText]}>Rank #{summary.data.rank}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {entries.length === 0 ? (
          <EmptyState
            title={t('common.empty')}
            description="Points are awarded once a donation is delivered."
          />
        ) : (
          entries.map((entry) => (
            <View key={entry.id} style={styles.rowCard}>
              <View style={styles.row}>
                <Text style={styles.reason}>{entry.reason}</Text>
                <Text style={styles.points}>+{entry.points}</Text>
              </View>
              <Text style={styles.date}>{formatDateTime(entry.awardedAt)}</Text>
            </View>
          ))
        )}
      </View>
    </DonorShell>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: donorColors.background, flex: 1, gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  pageTitle: { color: donorColors.ink, fontSize: 26, fontWeight: '800' },
  hero: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    gap: 6,
    padding: 20,
  },
  balance: { color: donorColors.orange, fontSize: 44, fontWeight: '800' },
  balanceLabel: { color: donorColors.muted, fontSize: 14 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badge: {
    backgroundColor: donorColors.greenSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: donorColors.green, fontSize: 12, fontWeight: '700' },
  badgeSoft: { backgroundColor: donorColors.orangeSoft },
  badgeSoftText: { color: donorColors.orange },
  rowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 4,
    padding: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  reason: { color: donorColors.ink, flex: 1, fontSize: 14, fontWeight: '700' },
  points: { color: donorColors.green, fontSize: 14, fontWeight: '800' },
  date: { color: donorColors.muted, fontSize: 12 },
});
