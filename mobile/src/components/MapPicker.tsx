import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import type { GeoPoint } from '@/types';
import { toGeoPoint, toLatLng } from '@/utils/geo';
import { MapView, Marker } from '@/utils/maps';

/** Colombo — used until the device reports a position. */
const FALLBACK_REGION: any = {
  latitude: 6.9271,
  longitude: 79.8612,
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
  const [region] = useState<any>(
    value ? { ...toLatLng(value), latitudeDelta: 0.02, longitudeDelta: 0.02 } : FALLBACK_REGION,
  );

  function handlePress(event: any) {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    onChange(toGeoPoint(latitude, longitude));
  }

  // Web fallback
  if (Platform.OS === 'web' || !MapView) {
    return (
      <View style={styles.wrapper}>
        {Boolean(label) && <Text style={styles.label}>{label}</Text>}
        <View style={[styles.mapFrame, styles.webPlaceholder, { height }]}>
          <Text style={styles.webText}>Map not available on web</Text>
          <Text style={styles.hint}>Please use mobile app for map features</Text>
        </View>
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
  webPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  webText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
