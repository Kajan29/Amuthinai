import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { adminApi } from '@/api/admin.api';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button, Card, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { colors, radius, spacing, typography } from '@/theme';
import { MapView, Circle } from '@/utils/maps';

/** FR8 — KPI cards over a demand heat-map built from open recipient requests. */
export default function AdminDashboard() {
  const { t } = useTranslation();
  const { confirmLogout } = useAuth();

  const kpis = useOfflineQuery('admin.kpis', () => adminApi.kpis());
  const demand = useOfflineQuery('admin.demand', () => adminApi.demandHeatmap());

  const cells = demand.data ?? [];
  const peak = Math.max(...cells.map((cell) => cell.servingsNeeded), 1);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>{t('admin.dashboard')}</Text>
        <View style={styles.headerRight}>
          <LanguageSwitcher />
          <TouchableOpacity onPress={confirmLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.kpiGrid}>
        <Kpi label={t('admin.approvals')} value={kpis.data?.pendingApprovals ?? 0} tone="warning" />
        <Kpi label="Active deliveries" value={kpis.data?.activeDeliveries ?? 0} tone="info" />
        <Kpi label="Servings today" value={kpis.data?.servingsToday ?? 0} tone="success" />
        <Kpi label="Open disputes" value={kpis.data?.openDisputes ?? 0} tone="danger" />
      </View>

      <Card>
        <Text style={styles.cardTitle}>Demand heat-map</Text>
        {Platform.OS === 'web' || !MapView ? (
          <View style={[styles.mapFrame, styles.webPlaceholder]}>
            <Text style={styles.webText}>Map not available on web</Text>
          </View>
        ) : (
          <View style={styles.mapFrame}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: cells[0]?.latitude ?? 7.8731,
                longitude: cells[0]?.longitude ?? 80.7718,
                latitudeDelta: 3,
                longitudeDelta: 3,
              }}
            >
              {cells.map((cell) => (
                <Circle
                  key={cell.district}
                  center={{ latitude: cell.latitude, longitude: cell.longitude }}
                  radius={4000 + (cell.servingsNeeded / peak) * 16000}
                  fillColor={`rgba(208, 52, 44, ${0.15 + (cell.servingsNeeded / peak) * 0.4})`}
                  strokeColor="transparent"
                />
              ))}
            </MapView>
          </View>
        )}
        <Text style={styles.caption}>
          Circle size and shade follow the servings still unmatched in each district.
        </Text>
      </Card>

      <Button label={t('admin.approvals')} onPress={() => router.push('/(admin)/approvals')} />
    </Screen>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'warning' | 'info' | 'success' | 'danger';
}) {
  return (
    <View style={styles.kpi}>
      <Text style={[styles.kpiValue, { color: KPI_COLORS[tone] }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const KPI_COLORS = {
  warning: colors.warning,
  info: colors.info,
  success: colors.success,
  danger: colors.danger,
} as const;

const styles = StyleSheet.create({
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerRight: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  logoutButton: { padding: spacing.xs },
  heading: { ...typography.h3, color: colors.text },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kpi: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 2,
    padding: spacing.lg,
  },
  kpiValue: { ...typography.h1 },
  kpiLabel: { ...typography.caption, color: colors.textMuted },
  cardTitle: { ...typography.bodyStrong, color: colors.text },
  mapFrame: { borderRadius: radius.md, height: 240, overflow: 'hidden' },
  map: { flex: 1 },
  caption: { ...typography.caption, color: colors.textMuted },
  webPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  webText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
