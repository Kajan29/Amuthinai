import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { DonorDonationCard } from '@/components/donor/DonorDonationCard';
import { DonorShell } from '@/components/donor/DonorShell';
import { EmptyState } from '@/components/ui';
import { useDonorDashboard } from '@/hooks/useDonorDashboard';
import { donorColors } from '@/theme/donor';

/** Full donation list behind the Donations tab. */
export default function DonorDonations() {
  const { t } = useTranslation();
  const dashboard = useDonorDashboard();
  const items = dashboard.data?.donations ?? [];

  if (dashboard.isPending && !dashboard.data) {
    return (
      <DonorShell active="donations">
        <View style={styles.center}>
          <ActivityIndicator color={donorColors.plum} />
        </View>
      </DonorShell>
    );
  }

  return (
    <DonorShell active="donations">
      <FlatList
        style={styles.root}
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(donation) => donation.id}
        refreshing={dashboard.isFetching}
        onRefresh={() => void dashboard.refetch()}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={<Text style={styles.title}>{t('donor.navDonations')}</Text>}
        ListEmptyComponent={<EmptyState title={t('common.empty')} description={t('donor.emptyDonations')} />}
        renderItem={({ item }) => (
          <DonorDonationCard
            donation={item}
            onPress={() => router.push(`/(donor)/donation/${item.id}`)}
          />
        )}
      />
    </DonorShell>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: donorColors.background, flex: 1 },
  center: {
    alignItems: 'center',
    backgroundColor: donorColors.background,
    flex: 1,
    justifyContent: 'center',
  },
  content: { paddingBottom: 24, paddingHorizontal: 16, paddingTop: 8 },
  title: { color: donorColors.ink, fontSize: 26, fontWeight: '800', marginBottom: 16 },
  separator: { height: 12 },
});
