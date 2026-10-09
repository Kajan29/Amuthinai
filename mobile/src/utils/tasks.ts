import type { Href } from 'expo-router';

import type { TaskView } from '@/types';

/** Matches `POINTS.deliveryCompleted` on the backend. */
export const KARMA_PER_DELIVERY = 30;

/** Average city speed the backend also uses for ETAs. */
const CITY_SPEED_KMH = 20;

export function etaMinutes(km: number | null | undefined): number {
  if (!km || km <= 0) return 1;
  return Math.max(1, Math.round((km / CITY_SPEED_KMH) * 60));
}

export function formatKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return '—';
  return `${Math.round(km * 10) / 10} km`;
}

/** One-line drop-off description; falls back to the admin-matching notice when unlinked. */
export function dropOffLabel(task: TaskView): string {
  const drop = task.request?.dropAddress;
  if (!drop) return 'Drop-off assigned once a recipient is matched';
  const name = task.recipient?.name;
  const place = [drop.line1, drop.city].filter(Boolean).join(', ');
  return name ? `${name} · ${place}` : place;
}

export function pickupLabel(task: TaskView): string {
  const pickup = task.donation.pickupAddress;
  return [pickup.line1, pickup.city].filter(Boolean).join(', ');
}

export function isTaskActive(task: TaskView): boolean {
  return task.assignment.status === 'accepted';
}

export function isTaskCompleted(task: TaskView): boolean {
  return task.assignment.status === 'completed';
}

/** Where "Continue" should take the volunteer for an accepted task. */
export function nextStepHref(task: TaskView): Href {
  const status = task.donation.status;
  if (status === 'picked_up' || status === 'in_transit') {
    return `/(volunteer)/delivery/${task.assignment.id}` as Href;
  }
  return `/(volunteer)/pickup/${task.assignment.id}` as Href;
}

export function initials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}
