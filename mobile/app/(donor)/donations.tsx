import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DonorDonationCard } from '@/components/donor/DonorDonationCard';
import { EmptyState } from '@/components/ui';
import { useDonorDashboard } from '@/hooks/useDonorDashboard';
import { donorColors } from '@/theme/donor';

/** Full donation list behind the Donations tab. */
export default function DonorDonations() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dashboard = useDonorDashboard();
  const items = dashboard.data?.donations ?? [];

  if (dashboard.isPending && !dashboard.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={donorColors.plum} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 16, 24),
          paddingBottom: Math.max(insets.bottom + 80, 96),
        },
      ]}
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
  content: { paddingBottom: 24, paddingHorizontal: 16 },
  title: { color: donorColors.ink, fontSize: 26, fontWeight: '800', marginBottom: 16 },
  separator: { height: 12 },
});
