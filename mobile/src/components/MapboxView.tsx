import Mapbox from '@rnmapbox/maps';
import { useEffect, useState } from 'react';
import { StyleSheet, View, Platform, Text } from 'react-native';
import { MAPBOX_ACCESS_TOKEN } from '@/constants';
import type { GeoPoint } from '@/types';
import { toLatLng } from '@/utils/geo';
import { colors } from '@/theme';

// Initialize Mapbox
if (MAPBOX_ACCESS_TOKEN && Platform.OS !== 'web') {
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
}

interface MapboxViewProps {
  center?: GeoPoint;
  markers?: Array<{
    id: string;
    coordinate: GeoPoint;
    title?: string;
    description?: string;
  }>;
  onPress?: (coordinate: { latitude: number; longitude: number }) => void;
  style?: any;
  zoomLevel?: number;
  showUserLocation?: boolean;
}

export function MapboxView({
  center,
  markers = [],
  onPress,
  style,
  zoomLevel = 12,
  showUserLocation = true,
}: MapboxViewProps) {
  const [cameraCenter, setCameraCenter] = useState<[number, number]>(
    center ? [center.coordinates[0], center.coordinates[1]] : [79.8612, 6.9271] // Colombo
  );

  useEffect(() => {
    if (center) {
      setCameraCenter([center.coordinates[0], center.coordinates[1]]);
    }
  }, [center]);

  const handleMapPress = (feature: any) => {
    if (onPress && feature.geometry) {
      const [longitude, latitude] = feature.geometry.coordinates;
      onPress({ latitude, longitude });
    }
  };

  // Web fallback
  if (Platform.OS === 'web' || !MAPBOX_ACCESS_TOKEN) {
    return (
      <View style={[styles.container, styles.fallback, style]}>
        <Text style={styles.fallbackText}>Map not available</Text>
        <Text style={styles.fallbackHint}>Please use mobile app</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={Mapbox.StyleURL.Street}
        onPress={handleMapPress}
      >
        <Mapbox.Camera
          zoomLevel={zoomLevel}
          centerCoordinate={cameraCenter}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {showUserLocation && (
          <Mapbox.UserLocation
            visible={true}
            showsUserHeadingIndicator={true}
          />
        )}

        {markers.map((marker) => {
          const latLng = toLatLng(marker.coordinate);
          return (
            <Mapbox.PointAnnotation
              key={marker.id}
              id={marker.id}
              coordinate={[latLng.longitude, latLng.latitude]}
            >
              <View style={styles.markerContainer}>
                <View style={styles.marker} />
              </View>
              {marker.title && (
                <Mapbox.Callout title={marker.title} />
              )}
            </Mapbox.PointAnnotation>
          );
        })}
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D97706',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  fallbackText: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 8,
  },
  fallbackHint: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
