import { useEffect, useState } from 'react';

import { formatTimeLeft } from '@/utils/freshness';

/** Ticks once a minute — enough for the 6-hour freshness window (FR3). */
export function useCountdown(target: string | Date, tickMs = 60_000) {
  const targetMs = typeof target === 'string' ? new Date(target).getTime() : target.getTime();
  const [minutesLeft, setMinutesLeft] = useState(() =>
    Math.floor((targetMs - Date.now()) / 60_000),
  );

  useEffect(() => {
    setMinutesLeft(Math.floor((targetMs - Date.now()) / 60_000));
    const id = setInterval(() => {
      setMinutesLeft(Math.floor((targetMs - Date.now()) / 60_000));
    }, tickMs);

    return () => clearInterval(id);
  }, [targetMs, tickMs]);

  return {
    minutesLeft,
    isExpired: minutesLeft <= 0,
    label: formatTimeLeft(minutesLeft),
  };
}
