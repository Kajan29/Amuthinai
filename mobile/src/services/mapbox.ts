import { MAPBOX_ACCESS_TOKEN } from '@/constants';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface MapboxMarker {
  latitude: number;
  longitude: number;
  label?: string; // e.g. 'a', 'b', '1', '2'
  color?: string; // hex without '#' e.g. '5A1626'
  size?: 's' | 'm' | 'l'; // default 's'
}

/**
 * Generates a Mapbox Static Map API URL
 */
export function getMapboxStaticMapUrl(params: {
  center?: LatLng;
  zoom?: number;
  width?: number;
  height?: number;
  retina?: boolean;
  markers?: MapboxMarker[];
  style?: 'streets-v12' | 'outdoors-v12' | 'light-v11' | 'navigation-day-v1';
  auto?: boolean; // if true, fits all markers automatically
}): string {
  const {
    center = { latitude: 9.6645, longitude: 80.0200 },
    zoom = 13.5,
    width = 600,
    height = 340,
    retina = true,
    markers = [],
    style = 'streets-v12',
    auto = false,
  } = params;

  // Format markers: pin-s-{label}+{color}({lng},{lat})
  const markerStrings = markers.map((m) => {
    const size = m.size || 's';
    const label = m.label ? `-${m.label}` : '';
    const color = m.color ? `+${m.color.replace('#', '')}` : '+5A1626';
    return `pin-${size}${label}${color}(${m.longitude.toFixed(5)},${m.latitude.toFixed(5)})`;
  });

  const overlayPart = markerStrings.length > 0 ? `${markerStrings.join(',')}/` : '';
  const positionPart = auto
    ? 'auto'
    : `${center.longitude.toFixed(5)},${center.latitude.toFixed(5)},${zoom},0`;

  const sizePart = `${width}x${height}${retina ? '@2x' : ''}`;

  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${overlayPart}${positionPart}/${sizePart}?access_token=${MAPBOX_ACCESS_TOKEN}`;
}

/**
 * Volunteer Dashboard Hero Map URL
 */
export function getVolunteerDashboardMapUrl(
  userCoords?: LatLng,
  taskPickups: (LatLng & { urgent?: boolean })[] = [],
): string {
  const user = userCoords || { latitude: 9.6645, longitude: 80.0200 };
  const markers: MapboxMarker[] = [
    { latitude: user.latitude, longitude: user.longitude, color: '0F766E', size: 's' },
    ...taskPickups.slice(0, 9).map((pickup, index) => ({
      latitude: pickup.latitude,
      longitude: pickup.longitude,
      label: String(index + 1),
      color: pickup.urgent ? 'D97706' : '5A1626',
      size: 's' as const,
    })),
  ];
  return getMapboxStaticMapUrl({
    center: user,
    zoom: 13.2,
    width: 600,
    height: 320,
    retina: true,
    markers,
    auto: markers.length > 1,
  });
}

/**
 * Route Transit Map URL (Point A -> Point B)
 */
export function getRouteTransitMapUrl(params: {
  origin: LatLng;
  destination: LatLng;
}): string {
  const { origin, destination } = params;
  const centerLat = (origin.latitude + destination.latitude) / 2;
  const centerLng = (origin.longitude + destination.longitude) / 2;

  return getMapboxStaticMapUrl({
    center: { latitude: centerLat, longitude: centerLng },
    zoom: 13.6,
    width: 600,
    height: 440,
    retina: true,
    markers: [
      {
        latitude: origin.latitude,
        longitude: origin.longitude,
        label: 'a',
        color: '5A1626', // Point A Maroon
        size: 's',
      },
      {
        latitude: destination.latitude,
        longitude: destination.longitude,
        label: 'b',
        color: '1E3A4B', // Point B Navy
        size: 's',
      },
    ],
  });
}

/**
 * Mapbox Directions API for live routing distance, duration and polyline
 */
export async function getMapboxDirections(
  origin: LatLng,
  destination: LatLng,
  profile: 'cycling' | 'driving' | 'walking' = 'cycling',
) {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      const route = data.routes[0];
      return {
        distanceKm: (route.distance / 1000).toFixed(1),
        durationMinutes: Math.round(route.duration / 60),
        coordinates: route.geometry?.coordinates || [],
      };
    }
  } catch (error) {
    console.warn('Mapbox Directions error:', error);
  }
  return null;
}

/**
 * Admin Dashboard & Operations Map URL with layer-based markers (Hubs, Pickups, Dropoffs, Demand)
 */
export interface AdminMapPoints {
  hubs: LatLng[];
  donations: LatLng[];
  deliveries: (LatLng & { delayed?: boolean })[];
  demand: LatLng[];
}

/** Static URLs get long quickly; Mapbox rejects anything over ~8k characters. */
const MAX_STATIC_MARKERS = 60;

export function getAdminDashboardMapUrl(params: {
  layer?: 'all' | 'hubs' | 'donations' | 'routes' | 'demand';
  points: AdminMapPoints;
  zoom?: number;
  width?: number;
  height?: number;
}): string {
  const layer = params.layer ?? 'all';
  const width = params.width ?? 680;
  const height = params.height ?? 380;
  const zoom = params.zoom ?? 12.8;
  const { points } = params;

  const markers: MapboxMarker[] = [];

  if (layer === 'all' || layer === 'hubs') {
    markers.push(...points.hubs.map((p) => ({ ...p, label: 'h', color: '1E3A4B', size: 's' as const })));
  }
  if (layer === 'all' || layer === 'donations') {
    markers.push(
      ...points.donations.map((p, index) => ({
        ...p,
        label: String((index % 9) + 1),
        color: '0F766E',
        size: 's' as const,
      })),
    );
  }
  if (layer === 'all' || layer === 'routes') {
    markers.push(
      ...points.deliveries.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
        label: 'd',
        color: p.delayed ? 'D97706' : '5A1626',
        size: 's' as const,
      })),
    );
  }
  if (layer === 'all' || layer === 'demand') {
    markers.push(...points.demand.map((p) => ({ ...p, label: 'x', color: 'E53E3E', size: 's' as const })));
  }

  const limited = markers.slice(0, MAX_STATIC_MARKERS);

  return getMapboxStaticMapUrl({
    center: limited[0] ?? { latitude: 9.6680, longitude: 80.0280 },
    zoom,
    width,
    height,
    retina: true,
    style: 'streets-v12',
    markers: limited,
    auto: limited.length > 1,
  });
}
