import { FoodType, MAX_SAFE_HOURS } from '../enums/food-type.enum';

const MS_PER_HOUR = 60 * 60 * 1000;

/** FR3 — the moment the food stops being safe to consume. */
export function expiresAt(cookedAt: Date, safeForHours: number): Date {
  return new Date(cookedAt.getTime() + safeForHours * MS_PER_HOUR);
}

export function minutesUntilExpiry(expiry: Date, now: Date = new Date()): number {
  return Math.floor((expiry.getTime() - now.getTime()) / 60_000);
}

export function isExpired(expiry: Date, now: Date = new Date()): boolean {
  return expiry.getTime() <= now.getTime();
}

/**
 * FR3 — a donor may not declare a window longer than the food type allows, and a window
 * that already closed is pointless. Returns the clamped value.
 */
export function clampSafeHours(foodType: FoodType, requestedHours: number): number {
  const max = MAX_SAFE_HOURS[foodType];
  return Math.min(Math.max(Math.round(requestedHours), 1), max);
}

/** Donations within this window are surfaced as urgent to volunteers (FR8). */
export const URGENT_THRESHOLD_MINUTES = 90;

export function isUrgent(expiry: Date, now: Date = new Date()): boolean {
  const minutes = minutesUntilExpiry(expiry, now);
  return minutes > 0 && minutes <= URGENT_THRESHOLD_MINUTES;
}
