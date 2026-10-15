import { BadRequestException } from '@nestjs/common';

import { FoodType, MAX_SAFE_HOURS } from '../enums/food-type.enum';

const MS_PER_HOUR = 60 * 60 * 1000;
/** FR3 — cooked meals must be posted within this many hours of preparation. */
export const COOKED_POST_MAX_AGE_HOURS = 6;

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
/**
 * FR3 — cooked food may only be posted if it was prepared within the last 6 hours
 * and is not dated in the future.
 */
export function assertPrepareTimeForPost(
  foodType: FoodType,
  cookedAt: Date,
  now: Date = new Date(),
): void {
  if (Number.isNaN(cookedAt.getTime())) {
    throw new BadRequestException('Prepare time is required');
  }
  if (cookedAt.getTime() > now.getTime()) {
    throw new BadRequestException('Prepare time cannot be in the future');
  }
  if (foodType === FoodType.Cooked) {
    const oldestAllowed = now.getTime() - COOKED_POST_MAX_AGE_HOURS * MS_PER_HOUR;
    if (cookedAt.getTime() < oldestAllowed) {
      throw new BadRequestException(
        'Cooked food must be posted within 6 hours of preparation',
      );
    }
  }
}

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
