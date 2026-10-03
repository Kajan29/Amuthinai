import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { adminApi } from '@/api/admin.api';
import { Card, EmptyState, Screen } from '@/components/ui';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { colors, radius, spacing, typography } from '@/theme';

/** FR8 — district demand as a ranked bar list, the tabular companion to the heat-map. */
export default function Analytics() {
  const { t } = useTranslation();

  const kpis = useOfflineQuery('admin.kpis', () => adminApi.kpis());
  const demand = useOfflineQuery('admin.demand', () => adminApi.demandHeatmap());

  const cells = [...(demand.data ?? [])].sort((a, b) => b.servingsNeeded - a.servingsNeeded);
  const peak = Math.max(...cells.map((cell) => cell.servingsNeeded), 1);

  return (
    <Screen>
      <Card>
        <Text style={styles.cardTitle}>Impact</Text>
        <Row label="Servings delivered today" value={kpis.data?.servingsToday ?? 0} />
        <Row label="Food waste averted (kg)" value={kpis.data?.wasteAvertedKg ?? 0} />
        <Row label="Deliveries in progress" value={kpis.data?.activeDeliveries ?? 0} />
      </Card>

      <Text style={styles.heading}>{t('admin.analytics')} by district</Text>

      {cells.length === 0 ? (
        <EmptyState title={t('common.empty')} />
      ) : (
        cells.map((cell) => (
          <Card key={cell.district}>
            <View style={styles.barHeader}>
              <Text style={styles.district}>{cell.district}</Text>
              <Text style={styles.value}>{cell.servingsNeeded} servings</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(cell.servingsNeeded / peak) * 100}%` }]} />
            </View>
            <Text style={styles.meta}>{cell.openRequests} open requests</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { ...typography.bodyStrong, color: colors.text },
  heading: { ...typography.h3, color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { ...typography.body, color: colors.textMuted },
  rowValue: { ...typography.bodyStrong, color: colors.text },
  barHeader: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  district: { ...typography.bodyStrong, color: colors.text },
  value: { ...typography.caption, color: colors.textMuted },
  track: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 8,
    overflow: 'hidden',
  },
  fill: { backgroundColor: colors.primary, height: 8 },
  meta: { ...typography.caption, color: colors.textMuted },
});
