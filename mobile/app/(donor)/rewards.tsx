import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { pointsApi } from '@/api/points.api';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Badge, Card, EmptyState, Screen } from '@/components/ui';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { colors, spacing, typography } from '@/theme';
import { formatDateTime } from '@/utils/date';

/** FR10 — karma points balance, tier and the ledger that produced it. */
export default function Rewards() {
  const { t } = useTranslation();
  const summary = useOfflineQuery('donor.points', () => pointsApi.summary());

  const entries = summary.data?.entries ?? [];

  return (
    <Screen extraBottomPadding={60}>
      <LanguageSwitcher />

      <Card>
        <Text style={styles.balance}>{summary.data?.balance ?? 0}</Text>
        <Text style={styles.balanceLabel}>{t('donor.karmaPoints')}</Text>
        {summary.data ? (
          <View style={styles.badges}>
            <Badge label={summary.data.tier} tone="success" />
            <Badge label={`Rank #${summary.data.rank}`} tone="info" />
          </View>
        ) : null}
      </Card>

      {entries.length === 0 ? (
        <EmptyState
          title={t('common.empty')}
          description="Points are awarded once a donation is delivered."
        />
      ) : (
        entries.map((entry) => (
          <Card key={entry.id}>
            <View style={styles.row}>
              <Text style={styles.reason}>{entry.reason}</Text>
              <Text style={styles.points}>+{entry.points}</Text>
            </View>
            <Text style={styles.date}>{formatDateTime(entry.awardedAt)}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  balance: { ...typography.h1, color: colors.primary, fontSize: 44, textAlign: 'center' },
  balanceLabel: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  badges: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  reason: { ...typography.bodyStrong, color: colors.text, flex: 1 },
  points: { ...typography.bodyStrong, color: colors.success },
  date: { ...typography.caption, color: colors.textMuted },
});
