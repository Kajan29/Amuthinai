const EARTH_RADIUS_KM = 6371;

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** GeoJSON stores longitude first; this is the most common source of bugs here. */
export function toCoordinates({ latitude, longitude }: LatLng): [number, number] {
  return [longitude, latitude];
}

export function toLatLng(coordinates: [number, number]): LatLng {
  const [longitude, latitude] = coordinates;
  return { latitude, longitude };
}

/** Great-circle distance in kilometres, rounded to 100 m. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const from = toLatLng(a);
  const to = toLatLng(b);
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;

  return Math.round(2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/** Builds a `$nearSphere` filter for a 2dsphere-indexed field. */
export function nearSphere(coordinates: [number, number], maxDistanceKm: number) {
  return {
    $nearSphere: {
      $geometry: { type: 'Point' as const, coordinates },
      $maxDistance: maxDistanceKm * 1000,
    },
  };
}
