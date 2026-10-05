import type { ReactNode } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Browser stand-in for react-native-maps. The real map is native-only, and importing it
 * stops the whole Expo web bundle, including screens that never open the map.
 */
export function MapView({
  children,
  style,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  initialRegion?: Region;
  onPress?: (event: MapPressEvent) => void;
}) {
  return (
    <View style={[placeholder, style]}>
      <Text>Map opens in the mobile app.</Text>
      {children}
    </View>
  );
}

export function Marker(_props: {
  coordinate?: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  pinColor?: string;
  onCalloutPress?: () => void;
}) {
  return null;
}

export function Circle(_props: {
  center?: { latitude: number; longitude: number };
  radius?: number;
  fillColor?: string;
  strokeColor?: string;
}) {
  return null;
}

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapPressEvent {
  nativeEvent: { coordinate: { latitude: number; longitude: number } };
}

const placeholder = {
  alignItems: 'center' as const,
  backgroundColor: '#E7E2DC',
  justifyContent: 'center' as const,
};
