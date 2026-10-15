import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { MAPBOX_ACCESS_TOKEN } from '@/constants';
import { MapboxStaticImage } from '@/components/MapboxStaticImage';
import {
  getMapboxStaticMapUrl,
  latDeltaToZoom,
  type MapboxPath,
} from '@/services/mapbox';

import { MAPBOX_GL_HTML } from './mapHtml';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapPressEvent = {
  nativeEvent: { coordinate: { latitude: number; longitude: number } };
};

export type MapViewRef = {
  animateToRegion: (region: Region, _durationMs?: number) => void;
};

type LatLng = { latitude: number; longitude: number };

type MarkerProps = {
  coordinate: LatLng;
  title?: string;
  description?: string;
  pinColor?: string;
  onPress?: () => void;
  onCalloutPress?: () => void;
  children?: ReactNode;
};

type CircleProps = {
  center: LatLng;
  radius: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
};

type PolylineProps = {
  coordinates: LatLng[];
  strokeColor?: string;
  strokeWidth?: number;
};

type MapViewProps = {
  style?: StyleProp<ViewStyle>;
  initialRegion?: Region;
  onPress?: (event: MapPressEvent) => void;
  onRegionChangeComplete?: (region: Region) => void;
  children?: ReactNode;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
};

const JAFFNA_REGION: Region = {
  latitude: 9.6645,
  longitude: 80.02,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export function Marker(_props: MarkerProps) {
  return null;
}
Marker.displayName = 'MapboxMarker';

export function Circle(_props: CircleProps) {
  return null;
}
Circle.displayName = 'MapboxCircle';

export function Polyline(_props: PolylineProps) {
  return null;
}
Polyline.displayName = 'MapboxPolyline';

function flattenChildren(children: ReactNode): ReactElement[] {
  const out: ReactElement[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      out.push(...flattenChildren((child.props as { children?: ReactNode }).children));
      return;
    }
    out.push(child);
  });
  return out;
}

function toCssColor(color?: string): string {
  if (!color) return '#5A1626';
  if (color.startsWith('#') || color.startsWith('rgb')) return color;
  const named: Record<string, string> = {
    red: '#E53E3E',
    green: '#0F7B4F',
    blue: '#2B6CB0',
    tomato: '#E53E3E',
    orange: '#D97706',
    gold: '#F59E0B',
  };
  return named[color.toLowerCase()] ?? '#5A1626';
}

function collectLayers(children: ReactNode) {
  const markers: Array<MarkerProps & { id: string }> = [];
  const circles: Array<CircleProps & { id: string }> = [];
  const polylines: Array<PolylineProps & { id: string }> = [];

  flattenChildren(children).forEach((child, index) => {
    const id = String(child.key ?? index);
    if (child.type === Marker) {
      markers.push({ id, ...(child.props as MarkerProps) });
    } else if (child.type === Circle) {
      circles.push({ id, ...(child.props as CircleProps) });
    } else if (child.type === Polyline) {
      polylines.push({ id, ...(child.props as PolylineProps) });
    }
  });

  return { markers, circles, polylines };
}

function inject(ref: { current: WebView | null }, js: string) {
  ref.current?.injectJavaScript(`${js}; true;`);
}

function latLngToWorld(latitude: number, longitude: number) {
  const x = (longitude + 180) / 360;
  const sinLat = Math.sin((latitude * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI);
  return { x, y };
}

function worldToLatLng(x: number, y: number) {
  const longitude = x * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y;
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { latitude, longitude };
}

function screenToLatLng(
  tapX: number,
  tapY: number,
  width: number,
  height: number,
  region: Region,
): LatLng {
  const zoom = latDeltaToZoom(region.latitudeDelta);
  const worldSize = 256 * 2 ** zoom;
  const center = latLngToWorld(region.latitude, region.longitude);
  const worldX = center.x * worldSize - width / 2 + tapX;
  const worldY = center.y * worldSize - height / 2 + tapY;
  return worldToLatLng(worldX / worldSize, worldY / worldSize);
}

function StaticFallback({
  style,
  region,
  layers,
  onPress,
}: {
  style?: StyleProp<ViewStyle>;
  region: Region;
  layers: ReturnType<typeof collectLayers>;
  onPress?: (event: MapPressEvent) => void;
}) {
  const sizeRef = useRef({ width: 720, height: 520 });
  const paths: MapboxPath[] = [
    ...layers.polylines.map((line) => ({
      coordinates: line.coordinates,
      strokeColor: line.strokeColor,
      strokeWidth: line.strokeWidth,
    })),
    ...layers.circles.map((circle) => ({
      coordinates: circleToPath(circle.center, circle.radius),
      strokeColor: circle.strokeColor,
      strokeWidth: 2,
      strokeOpacity: 0.7,
    })),
  ];

  const uri = getMapboxStaticMapUrl({
    center: region,
    zoom: latDeltaToZoom(region.latitudeDelta),
    width: Math.max(320, Math.round(sizeRef.current.width)),
    height: Math.max(240, Math.round(sizeRef.current.height)),
    auto: layers.markers.length > 1,
    markers: layers.markers.map((marker, index) => ({
      latitude: marker.coordinate.latitude,
      longitude: marker.coordinate.longitude,
      color: toCssColor(marker.pinColor).replace('#', ''),
      label: String((index % 9) + 1),
    })),
    paths,
  });

  return (
    <Pressable
      style={[styles.fill, style]}
      onLayout={(event) => {
        sizeRef.current = {
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        };
      }}
      onPress={(event) => {
        if (!onPress) return;
        const { locationX, locationY } = event.nativeEvent;
        const coordinate = screenToLatLng(
          locationX,
          locationY,
          sizeRef.current.width,
          sizeRef.current.height,
          region,
        );
        const hit = layers.markers.find((marker) => {
          const dx = marker.coordinate.latitude - coordinate.latitude;
          const dy = marker.coordinate.longitude - coordinate.longitude;
          return Math.hypot(dx, dy) < region.latitudeDelta * 0.08;
        });
        if (hit?.onPress) {
          hit.onPress();
          return;
        }
        onPress({ nativeEvent: { coordinate } });
      }}
    >
      <MapboxStaticImage uri={uri} />
    </Pressable>
  );
}

function circleToPath(center: LatLng, radiusMeters: number): LatLng[] {
  const points: LatLng[] = [];
  const latRad = (center.latitude * Math.PI) / 180;
  const dLat = radiusMeters / 110540;
  const dLng = radiusMeters / (111320 * Math.max(Math.cos(latRad), 0.01));
  for (let i = 0; i <= 24; i += 1) {
    const angle = (2 * Math.PI * i) / 24;
    points.push({
      latitude: center.latitude + dLat * Math.sin(angle),
      longitude: center.longitude + dLng * Math.cos(angle),
    });
  }
  return points;
}

export const MapView = forwardRef(function MapView(
  {
    style,
    initialRegion = JAFFNA_REGION,
    onPress,
    onRegionChangeComplete,
    children,
  }: MapViewProps,
  ref: Ref<MapViewRef>,
) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const markerHandlers = useRef<Record<string, () => void>>({});
  const [failed, setFailed] = useState(!MAPBOX_ACCESS_TOKEN);
  const regionRef = useRef(initialRegion);

  const layers = useMemo(() => collectLayers(children), [children]);

  markerHandlers.current = Object.fromEntries(
    layers.markers.map((marker) => [
      marker.id,
      () => {
        marker.onPress?.();
        marker.onCalloutPress?.();
      },
    ]),
  );

  const layerPayload = useMemo(
    () => ({
      token: MAPBOX_ACCESS_TOKEN,
      region: regionRef.current,
      markers: layers.markers.map((marker) => ({
        id: marker.id,
        latitude: marker.coordinate.latitude,
        longitude: marker.coordinate.longitude,
        color: toCssColor(marker.pinColor),
        title: marker.title ?? '',
      })),
      polylines: layers.polylines.map((line) => ({
        id: line.id,
        coordinates: line.coordinates,
        strokeColor: toCssColor(line.strokeColor),
        strokeWidth: line.strokeWidth ?? 4,
      })),
      circles: layers.circles.map((circle) => ({
        id: circle.id,
        latitude: circle.center.latitude,
        longitude: circle.center.longitude,
        radius: circle.radius,
        fillColor: circle.fillColor,
        strokeColor: circle.strokeColor,
      })),
    }),
    [layers],
  );

  const pushState = useCallback(() => {
    if (!readyRef.current) return;
    inject(webRef, `window.__apply(${JSON.stringify(layerPayload)})`);
  }, [layerPayload]);

  useEffect(() => {
    pushState();
  }, [pushState]);

  useImperativeHandle(ref, () => ({
    animateToRegion(region) {
      regionRef.current = region;
      if (readyRef.current) {
        inject(webRef, `window.__animateTo(${JSON.stringify(region)})`);
      }
    },
  }));

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as {
          type?: string;
          id?: string;
          latitude?: number;
          longitude?: number;
          region?: Region;
          message?: string;
        };
        if (data.type === 'html-ready' || data.type === 'ready') {
          readyRef.current = true;
          inject(webRef, `window.__boot(${JSON.stringify(layerPayload)})`);
          return;
        }
        if (data.type === 'error') {
          setFailed(true);
          return;
        }
        if (data.type === 'press' && data.latitude != null && data.longitude != null) {
          onPress?.({
            nativeEvent: { coordinate: { latitude: data.latitude, longitude: data.longitude } },
          });
          return;
        }
        if (data.type === 'markerPress' && data.id) {
          markerHandlers.current[data.id]?.();
          return;
        }
        if (data.type === 'region' && data.region) {
          regionRef.current = data.region;
          onRegionChangeComplete?.(data.region);
        }
      } catch {
        // Ignore malformed WebView messages.
      }
    },
    [layerPayload, onPress, onRegionChangeComplete],
  );

  if (failed) {
    return (
      <StaticFallback
        style={style}
        region={regionRef.current}
        layers={layers}
        onPress={onPress}
      />
    );
  }

  return (
    <View style={[styles.fill, style]}>
      <WebView
        ref={webRef}
        source={{ html: MAPBOX_GL_HTML, baseUrl: 'https://api.mapbox.com' }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        onLoadEnd={pushState}
        onMessage={handleMessage}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
      />
    </View>
  );
});

MapView.displayName = 'MapboxMapView';

export default MapView;

const styles = StyleSheet.create({
  fill: { flex: 1, width: '100%', minHeight: 180, overflow: 'hidden', backgroundColor: '#E4EFF5' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
