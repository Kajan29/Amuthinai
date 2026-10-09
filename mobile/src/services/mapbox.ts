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
export function getVolunteerDashboardMapUrl(userCoords?: LatLng): string {
  const user = userCoords || { latitude: 9.6645, longitude: 80.0200 };
  return getMapboxStaticMapUrl({
    center: {
      latitude: user.latitude + 0.003,
      longitude: user.longitude + 0.005,
    },
    zoom: 13.2,
    width: 600,
    height: 320,
    retina: true,
    markers: [
      {
        latitude: user.latitude,
        longitude: user.longitude,
        color: '0F766E', // Teal user location
        size: 's',
      },
      {
        latitude: 9.6740,
        longitude: 80.0290,
        label: '1',
        color: '5A1626', // Nallur Temple Hall (Biryani)
        size: 's',
      },
      {
        latitude: 9.6640,
        longitude: 80.0190,
        label: '2',
        color: 'D97706', // Town Bakery
        size: 's',
      },
    ],
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
export function getAdminDashboardMapUrl(params?: {
  layer?: 'all' | 'hubs' | 'donations' | 'routes' | 'demand';
  zoom?: number;
  width?: number;
  height?: number;
}): string {
  const layer = params?.layer ?? 'all';
  const width = params?.width ?? 680;
  const height = params?.height ?? 380;
  const zoom = params?.zoom ?? 12.8;

  const markers: MapboxMarker[] = [];

  // Hubs (Navy / Blue - 'h')
  if (layer === 'all' || layer === 'hubs') {
    markers.push(
      { latitude: 9.6615, longitude: 80.0167, label: 'h', color: '1E3A4B', size: 's' },
      { latitude: 9.6744, longitude: 80.0286, label: 'h', color: '1E3A4B', size: 's' },
      { latitude: 9.6542, longitude: 80.1582, label: 'h', color: '1E3A4B', size: 's' },
      { latitude: 9.6924, longitude: 80.0528, label: 'h', color: '1E3A4B', size: 's' },
    );
  }

  // Approved Donations (Teal / Green - '1', '2', '3')
  if (layer === 'all' || layer === 'donations') {
    markers.push(
      { latitude: 9.6744, longitude: 80.0286, label: '1', color: '0F766E', size: 's' },
      { latitude: 9.6610, longitude: 80.0195, label: '2', color: '0F766E', size: 's' },
      { latitude: 9.6910, longitude: 80.0510, label: '3', color: '0F766E', size: 's' },
    );
  }

  // Active Deliveries / Routes (Maroon / Orange - 'd')
  if (layer === 'all' || layer === 'routes') {
    markers.push(
      { latitude: 9.6520, longitude: 80.0380, label: 'd', color: '5A1626', size: 's' },
      { latitude: 9.6710, longitude: 80.0240, label: 'd', color: 'D97706', size: 's' },
      { latitude: 9.6580, longitude: 80.1520, label: 'd', color: '5A1626', size: 's' },
    );
  }

  // Demand Heat-Zones (Urgent Red - '!')
  if (layer === 'all' || layer === 'demand') {
    markers.push(
      { latitude: 9.6660, longitude: 80.0210, label: '!', color: 'E53E3E', size: 's' },
      { latitude: 9.6500, longitude: 80.0350, label: '!', color: 'E53E3E', size: 's' },
    );
  }

  return getMapboxStaticMapUrl({
    center: { latitude: 9.6680, longitude: 80.0280 },
    zoom,
    width,
    height,
    retina: true,
    style: 'streets-v12',
    markers,
  });
}
