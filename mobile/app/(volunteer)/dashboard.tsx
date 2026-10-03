import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { assignmentsApi } from '@/api/assignments.api';
import { DonationCard } from '@/components/DonationCard';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Badge, EmptyState } from '@/components/ui';
import { URGENT_THRESHOLD_MINUTES } from '@/constants';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { colors, radius, spacing, typography } from '@/theme';
import { toLatLng } from '@/utils/geo';

/** FR8 — map of nearby pickups plus the urgency-ordered task list. */
export default function VolunteerDashboard() {
  const { t } = useTranslation();
  const tasks = useOfflineQuery('volunteer.nearby', () => assignmentsApi.nearby());

  const items = tasks.data ?? [];
  const urgentCount = items.filter((task) => task.minutesLeft <= URGENT_THRESHOLD_MINUTES).length;
  const first = items[0];

  return (
    <View style={styles.root}>
      <View style={styles.mapFrame}>
        <MapView
          style={styles.map}
          initialRegion={{
            ...(first
              ? toLatLng(first.donation.pickupAddress.location)
              : { latitude: 6.9271, longitude: 79.8612 }),
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
        >
          {items.map((task) => (
            <Marker
              key={task.assignment.id}
              coordinate={toLatLng(task.donation.pickupAddress.location)}
              title={task.donation.title}
              description={`${task.distanceKm} km · ${task.donation.servings} servings`}
              pinColor={
                task.minutesLeft <= URGENT_THRESHOLD_MINUTES ? colors.danger : colors.primary
              }
            />
          ))}
        </MapView>
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={items}
        keyExtractor={(task) => task.assignment.id}
        refreshing={tasks.isFetching}
        onRefresh={() => void tasks.refetch()}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.headerRow}>
              <Text style={styles.heading}>{t('volunteer.dashboard')}</Text>
              <LanguageSwitcher />
            </View>
            {urgentCount > 0 && (
              <Badge label={`${urgentCount} ${t('volunteer.urgent')}`} tone="danger" />
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={t('common.empty')}
            description="New pickups inside your travel radius will show up here."
          />
        }
        renderItem={({ item }) => (
          <DonationCard
            donation={item.donation}
            distanceKm={item.distanceKm}
            onPress={() => router.push(`/(volunteer)/assignment/${item.assignment.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.surface, flex: 1 },
  mapFrame: { borderBottomColor: colors.border, borderBottomWidth: 1, height: 220 },
  map: { flex: 1 },
  list: { flex: 1 },
  listContent: { gap: spacing.md, padding: spacing.lg },
  listHeader: { gap: spacing.sm },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  heading: { ...typography.h3, color: colors.text },
  badge: { borderRadius: radius.pill },
});
