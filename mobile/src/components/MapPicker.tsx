import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { MapboxStaticImage } from '@/components/MapboxStaticImage';
import { getMapboxStaticMapUrl } from '@/services/mapbox';
import { colors, radius, spacing, typography } from '@/theme';
import type { GeoPoint } from '@/types';
import { toGeoPoint, toLatLng } from '@/utils/geo';
import { MapView, Marker } from '@/utils/maps';

/** Jaffna — used until the device reports a position. */
const FALLBACK_REGION = {
  latitude: 9.6645,
  longitude: 80.02,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

interface MapPickerProps {
  value: GeoPoint | null;
  onChange: (point: GeoPoint) => void;
  label?: string;
  height?: number;
}

/** FR5 — recipients drop a pin for the delivery location; donors reuse it for pickup. */
export function MapPicker({ value, onChange, label, height = 260 }: MapPickerProps) {
  const pin = value ? toLatLng(value) : FALLBACK_REGION;
  const [region] = useState({
    ...pin,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  function handlePress(event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    onChange(toGeoPoint(latitude, longitude));
  }

  const webMapUrl = getMapboxStaticMapUrl({
    center: pin,
    zoom: 14,
    width: 600,
    height: Math.round(height),
    markers: [{ latitude: pin.latitude, longitude: pin.longitude, label: 'home', color: '5A1626' }],
  });

  if (Platform.OS === 'web' || !MapView) {
    return (
      <View style={styles.wrapper}>
        {Boolean(label) && <Text style={styles.label}>{label}</Text>}
        <View style={[styles.mapFrame, { height }]}>
          <MapboxStaticImage uri={webMapUrl} />
        </View>
        <Text style={styles.hint}>
          {value
            ? `Pinned at ${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)}`
            : 'Map preview (pin dropping is available in the mobile app)'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {Boolean(label) && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.mapFrame, { height }]}>
        <MapView style={styles.map} initialRegion={region} onPress={handlePress}>
          {value && <Marker coordinate={toLatLng(value)} />}
        </MapView>
      </View>
      <Text style={styles.hint}>
        {value
          ? `Pinned at ${toLatLng(value).latitude.toFixed(5)}, ${toLatLng(value).longitude.toFixed(5)}`
          : 'Tap the map to drop a pin'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { ...typography.bodyStrong, color: colors.text },
  mapFrame: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  map: { flex: 1 },
  hint: { ...typography.caption, color: colors.textMuted },
});
