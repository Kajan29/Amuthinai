import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { DonorShell } from '@/components/donor/DonorShell';
import { MapboxStaticImage } from '@/components/MapboxStaticImage';
import { EmptyState } from '@/components/ui';
import { useDonorDashboard } from '@/hooks/useDonorDashboard';
import { getMapboxStaticMapUrl } from '@/services/mapbox';
import { donorColors } from '@/theme/donor';
import { MapView, Marker } from '@/utils/maps';

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

  const mapboxUrl = useMemo(
    () =>
      getMapboxStaticMapUrl({
        center: pins[0]?.pickup ?? JAFFNA,
        zoom: 12.5,
        width: 600,
        height: 700,
        auto: pins.length > 1,
        markers: pins.slice(0, 9).map((donation, index) => ({
          latitude: donation.pickup!.latitude,
          longitude: donation.pickup!.longitude,
          label: String(index + 1),
          color: '5A1626',
        })),
      }),
    [pins],
  );

  const first = pins[0]?.pickup;

  return (
    <DonorShell active="map">
      {!dashboard.isPending && pins.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState title={t('common.empty')} description={t('donor.emptyDonations')} />
        </View>
      ) : Platform.OS === 'web' || !MapView ? (
        <View style={styles.map}>
          <MapboxStaticImage uri={mapboxUrl} />
        </View>
      ) : (
        <MapView
          style={styles.map}
          initialRegion={
            first ? { ...first, latitudeDelta: 0.12, longitudeDelta: 0.12 } : JAFFNA
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
      )}
    </DonorShell>
  );
}

const styles = StyleSheet.create({
  map: { backgroundColor: donorColors.background, flex: 1 },
  empty: { backgroundColor: donorColors.background, flex: 1, justifyContent: 'center' },
});
