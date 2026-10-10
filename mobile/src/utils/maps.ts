/**
 * Native maps use Mapbox GL (WebView) instead of Google Maps.
 * react-native-maps crashes the Android APK when the Google key is missing.
 */

export {
  Circle,
  MapView,
  Marker,
  Polyline,
  type MapPressEvent,
  type MapViewRef,
  type Region,
} from '@/components/mapbox/MapboxMapView';
