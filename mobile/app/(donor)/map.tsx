import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { EmptyState } from '@/components/ui';
import { useDonorDashboard } from '@/hooks/useDonorDashboard';
import { donorColors } from '@/theme/donor';

const JAFFNA = {
  latitude: 9.6615,
  longitude: 80.0255,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

/** Pickup pins for the donor's own donations. */
export default function DonorMap() {
  const { t } = useTranslation();
  const dashboard = useDonorDashboard();

  const pins = useMemo(
    () => (dashboard.data?.donations ?? []).filter((donation) => donation.pickup),
    [dashboard.data],
  );

  if (!dashboard.isPending && pins.length === 0) {
    return (
      <View style={styles.empty}>
        <EmptyState title={t('common.empty')} description={t('donor.emptyDonations')} />
      </View>
    );
  }

  const first = pins[0]?.pickup;

  return (
    <MapView
      style={styles.map}
      initialRegion={
        first
          ? { ...first, latitudeDelta: 0.12, longitudeDelta: 0.12 }
          : JAFFNA
      }
    >
      {pins.map((donation) =>
        donation.pickup ? (
          <Marker
            key={donation.id}
            coordinate={donation.pickup}
            title={donation.title}
            description={donation.locationLabel}
            pinColor={donorColors.plum}
            onCalloutPress={() => router.push(`/(donor)/donation/${donation.id}`)}
          />
        ) : null,
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  empty: { backgroundColor: donorColors.background, flex: 1, justifyContent: 'center' },
});
