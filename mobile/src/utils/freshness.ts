import { DEFAULT_SAFE_HOURS, MAX_SAFE_HOURS, URGENT_THRESHOLD_MINUTES } from '@/constants';
import type { Donation, FoodType } from '@/types';

export type PrepareTimeIssue = 'missing' | 'invalid' | 'future' | 'too_old';

export function prepareWindowHours(foodType: FoodType = 'cooked'): number {
  return foodType === 'cooked' ? DEFAULT_SAFE_HOURS : MAX_SAFE_HOURS[foodType];
}

/** FR3 — cooked food may be posted only if it was prepared within the last 6 hours. */
export function validatePrepareTime(
  cookedAt: string | undefined,
  foodType: FoodType = 'cooked',
  now: Date = new Date(),
): { ok: true; maxHours: number } | { ok: false; issue: PrepareTimeIssue; maxHours: number } {
  const maxHours = prepareWindowHours(foodType);
  if (!cookedAt) return { ok: false, issue: 'missing', maxHours };
  const cooked = new Date(cookedAt).getTime();
  if (Number.isNaN(cooked)) return { ok: false, issue: 'invalid', maxHours };
  if (cooked > now.getTime() + 60_000) return { ok: false, issue: 'future', maxHours };
  if (now.getTime() - cooked > maxHours * 60 * 60 * 1000) {
    return { ok: false, issue: 'too_old', maxHours };
  }
  return { ok: true, maxHours };
}

export type FreshnessLevel = 'fresh' | 'urgent' | 'expired';

export interface Freshness {
  level: FreshnessLevel;
  minutesLeft: number;
  /** 0 → just cooked, 1 → window fully consumed. */
  progress: number;
}

/** FR3 — the moment food stops being safe to consume. */
export function expiryOf(cookedAt: string, safeForHours: number): Date {
  return new Date(new Date(cookedAt).getTime() + safeForHours * 60 * 60 * 1000);
}

export function freshnessOf(
  donation: Pick<Donation, 'cookedAt' | 'safeForHours'>,
  now: Date = new Date(),
): Freshness {
  const cooked = new Date(donation.cookedAt).getTime();
  const expires = expiryOf(donation.cookedAt, donation.safeForHours).getTime();

  const minutesLeft = Math.floor((expires - now.getTime()) / 60_000);
  const windowMs = Math.max(expires - cooked, 1);
  const progress = Math.min(Math.max((now.getTime() - cooked) / windowMs, 0), 1);

  const level: FreshnessLevel =
    minutesLeft <= 0 ? 'expired' : minutesLeft <= URGENT_THRESHOLD_MINUTES ? 'urgent' : 'fresh';

  return { level, minutesLeft, progress };
}

/** "4h 20m left" / "Expired 15m ago" — used by UrgentCountdown. */
export function formatTimeLeft(minutesLeft: number): string {
  const abs = Math.abs(minutesLeft);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  const span = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return minutesLeft <= 0 ? `Expired ${span} ago` : `${span} left`;
}
