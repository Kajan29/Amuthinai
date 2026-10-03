import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { offlineCache } from '@/services/offlineCache';

/**
 * NFR3 — wraps react-query so the last successful payload is persisted and reused as
 * placeholder data when the device is offline.
 */
export function useOfflineQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T>({
    queryKey: [key],
    async queryFn() {
      try {
        const fresh = await fetcher();
        await offlineCache.write(key, fresh);
        return fresh;
      } catch (error) {
        const cached = await offlineCache.read<T>(key);
        if (cached) return cached;
        throw error;
      }
    },
    ...options,
  });
}
