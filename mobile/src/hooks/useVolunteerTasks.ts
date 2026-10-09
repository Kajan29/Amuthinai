import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { assignmentsApi } from '@/api/assignments.api';
import { toLatLng } from '@/utils/geo';
import type { TaskView } from '@/types';

import { useLocation } from './useLocation';
import { useOfflineQuery } from './useOfflineQuery';

/**
 * Live and open tasks around the volunteer's current position, plus recent history. Falls
 * back to the volunteer's saved address on the server when location is unavailable.
 */
export function useVolunteerTasks(options: { withHistory?: boolean } = {}) {
  const location = useLocation(true);
  const originRef = useRef<{ latitude: number; longitude: number } | undefined>(undefined);
  originRef.current = location.point ? toLatLng(location.point) : undefined;

  const nearby = useOfflineQuery('volunteer.nearby', () => assignmentsApi.nearby(originRef.current), {
    refetchInterval: 60_000,
  });

  const history = useQuery({
    queryKey: ['volunteer.history'],
    queryFn: () => assignmentsApi.history({ pageSize: 30 }),
    enabled: options.withHistory ?? false,
  });

  const hasPoint = Boolean(location.point);
  useEffect(() => {
    if (hasPoint) void nearby.refetch();
    // Refetch once when the GPS fix first arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPoint]);

  const all = useMemo<TaskView[]>(() => {
    const live = nearby.data ?? [];
    const past = (history.data?.items ?? []).filter(
      (task) => !live.some((item) => item.assignment.id === task.assignment.id),
    );
    return [...live, ...past];
  }, [nearby.data, history.data]);

  return {
    tasks: all,
    live: nearby.data ?? [],
    history: history.data?.items ?? [],
    isLoading: nearby.isLoading,
    isFetching: nearby.isFetching || history.isFetching,
    error: nearby.error,
    refetch: async () => {
      await Promise.all([nearby.refetch(), options.withHistory ? history.refetch() : null]);
    },
  };
}
