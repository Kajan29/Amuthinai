import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { donationsApi } from '@/api/donations.api';
import { DonationCard } from '@/components/DonationCard';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button, Card, EmptyState } from '@/components/ui';
import { IN_TRANSIT_STATUSES, TERMINAL_STATUSES } from '@/constants';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { colors, radius, spacing, typography } from '@/theme';

type Tab = 'all' | 'inTransit' | 'history';

const TABS: { key: Tab; labelKey: string }[] = [
  { key: 'all', labelKey: 'donor.tabAll' },
  { key: 'inTransit', labelKey: 'donor.tabInTransit' },
  { key: 'history', labelKey: 'donor.tabHistory' },
];

export default function DonorDashboard() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('all');

  const donations = useOfflineQuery('donor.donations', () => donationsApi.list());
  const stats = useOfflineQuery('donor.stats', () => donationsApi.stats());

  const visible = useMemo(() => {
    const items = donations.data?.items ?? [];
    if (tab === 'inTransit') return items.filter((d) => IN_TRANSIT_STATUSES.includes(d.status));
    if (tab === 'history') return items.filter((d) => TERMINAL_STATUSES.includes(d.status));
    return items;
  }, [donations.data, tab]);

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      data={visible}
      keyExtractor={(donation) => donation.id}
      refreshing={donations.isFetching}
      onRefresh={() => void donations.refetch()}
      ListHeaderComponent={
        <View style={styles.header}>
          <LanguageSwitcher />

          <Card>
            <View style={styles.statsRow}>
              <Stat label={t('donor.totalDonations')} value={stats.data?.totalDonations ?? 0} />
              <Stat label={t('donor.servingsShared')} value={stats.data?.servingsShared ?? 0} />
              <Stat label={t('donor.karmaPoints')} value={stats.data?.karmaPoints ?? 0} />
            </View>
          </Card>

          <Button
            label={t('donor.postDonation')}
            onPress={() => router.push('/(donor)/post-donation/step1-food')}
          />

          <View style={styles.tabs}>
            {TABS.map(({ key, labelKey }) => (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.tab, tab === key && styles.tabActive]}
              >
                <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>
                  {t(labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          title={t('common.empty')}
          description="Donations you post will appear here."
          actionLabel={t('donor.postDonation')}
          onAction={() => router.push('/(donor)/post-donation/step1-food')}
        />
      }
      renderItem={({ item }) => (
        <DonationCard donation={item} onPress={() => router.push(`/(donor)/donation/${item.id}`)} />
      )}
    />
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: spacing.md, padding: spacing.lg },
  header: { gap: spacing.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1, gap: 2 },
  statValue: { ...typography.h2, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  tabs: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  tab: { borderRadius: radius.sm, flex: 1, paddingVertical: spacing.sm },
  tabActive: { backgroundColor: colors.primaryLight },
  tabLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  tabLabelActive: { color: colors.primaryDark, fontWeight: '600' },
});
