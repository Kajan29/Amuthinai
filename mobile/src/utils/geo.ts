import type { GeoPoint } from '@/types';

const EARTH_RADIUS_KM = 6371;

export function toGeoPoint(latitude: number, longitude: number): GeoPoint {
  return { type: 'Point', coordinates: [longitude, latitude] };
}

export function toLatLng(point: GeoPoint): { latitude: number; longitude: number } {
  const [longitude, latitude] = point.coordinates;
  return { latitude, longitude };
}

/** Great-circle distance in kilometres — used to preview volunteer travel distance (FR7). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const from = toLatLng(a);
  const to = toLatLng(b);
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;

  return Math.round(2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h)) * 10) / 10;
}
