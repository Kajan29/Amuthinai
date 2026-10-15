import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { MapboxStaticImage } from '@/components/MapboxStaticImage';
import { getMapboxStaticMapUrl } from '@/services/mapbox';
import type { GeoPoint } from '@/types';
import { toLatLng } from '@/utils/geo';

interface MapboxViewProps {
  center?: GeoPoint;
  markers?: Array<{
    id: string;
    coordinate: GeoPoint;
    title?: string;
    description?: string;
  }>;
  onPress?: (coordinate: { latitude: number; longitude: number }) => void;
  style?: object;
  zoomLevel?: number;
  showUserLocation?: boolean;
}

const JAFFNA = { latitude: 9.6645, longitude: 80.02 };

export function MapboxView({ center, markers = [], style, zoomLevel = 12 }: MapboxViewProps) {
  const camera = center ? toLatLng(center) : JAFFNA;

  const staticUrl = useMemo(
    () =>
      getMapboxStaticMapUrl({
        center: camera,
        zoom: zoomLevel,
        width: 600,
        height: 400,
        markers: markers.map((marker, index) => {
          const point = toLatLng(marker.coordinate);
          return {
            latitude: point.latitude,
            longitude: point.longitude,
            label: String((index % 9) + 1),
            color: 'D97706',
          };
        }),
      }),
    [camera.latitude, camera.longitude, markers, zoomLevel],
  );

  return (
    <View style={[styles.container, style]}>
      <MapboxStaticImage uri={staticUrl} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#E4EFF5',
  },
});
