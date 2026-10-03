import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import { toGeoPoint } from '@/utils/geo';
import type { GeoPoint } from '@/types';

interface LocationState {
  point: GeoPoint | null;
  error: string | null;
  isLoading: boolean;
}

/** Device location for map pins (FR5) and proof-of-delivery stamps (FR9). */
export function useLocation(requestOnMount = true) {
  const [state, setState] = useState<LocationState>({
    point: null,
    error: null,
    isLoading: requestOnMount,
  });

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, error: null }));

    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) {
      setState({ point: null, error: 'Location permission denied', isLoading: false });
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const point = toGeoPoint(position.coords.latitude, position.coords.longitude);
    setState({ point, error: null, isLoading: false });
    return point;
  }, []);

  useEffect(() => {
    if (requestOnMount) void refresh();
  }, [requestOnMount, refresh]);

  return { ...state, refresh };
}
