import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { pointsApi } from '@/api/points.api';
import { Badge, Card, EmptyState, Screen } from '@/components/ui';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { useAuth } from '@/hooks/useAuth';
import { colors, spacing, typography } from '@/theme';

/** FR10 — volunteers earn karma per completed delivery; the board is shared with donors. */
export default function VolunteerKarma() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const summary = useOfflineQuery('volunteer.points', () => pointsApi.summary());
  const leaderboard = useOfflineQuery('points.leaderboard', () => pointsApi.leaderboard());

  const rows = leaderboard.data ?? [];

  return (
    <Screen>
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

      <Text style={styles.heading}>Top volunteers</Text>

      {rows.length === 0 ? (
        <EmptyState title={t('common.empty')} />
      ) : (
        rows.map((row, index) => (
          <Card key={row.userId}>
            <View style={styles.row}>
              <Text style={[styles.name, row.userId === user?.id && styles.nameMe]}>
                {index + 1}. {row.name}
              </Text>
              <Text style={styles.points}>{row.points}</Text>
            </View>
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
  heading: { ...typography.h3, color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { ...typography.body, color: colors.text, flex: 1 },
  nameMe: { color: colors.primary, fontWeight: '700' },
  points: { ...typography.bodyStrong, color: colors.success },
});
