import { FoodType } from '../enums/food-type.enum';
import {
  clampSafeHours,
  expiresAt,
  isExpired,
  isUrgent,
  minutesUntilExpiry,
} from './freshness.util';

describe('freshness.util', () => {
  const cookedAt = new Date('2026-01-01T10:00:00.000Z');

  describe('expiresAt', () => {
    it('adds the safe window to the cooked time', () => {
      expect(expiresAt(cookedAt, 6).toISOString()).toBe('2026-01-01T16:00:00.000Z');
    });
  });

  describe('clampSafeHours', () => {
    it('caps cooked food at six hours', () => {
      expect(clampSafeHours(FoodType.Cooked, 24)).toBe(6);
    });

    it('leaves a window within the limit alone', () => {
      expect(clampSafeHours(FoodType.Packaged, 48)).toBe(48);
    });

    it('never returns less than an hour', () => {
      expect(clampSafeHours(FoodType.Cooked, 0)).toBe(1);
    });
  });

  describe('urgency', () => {
    const expiry = expiresAt(cookedAt, 6);

    it('reports the minutes remaining', () => {
      const now = new Date('2026-01-01T15:00:00.000Z');
      expect(minutesUntilExpiry(expiry, now)).toBe(60);
    });

    it('flags a donation inside the urgent window', () => {
      expect(isUrgent(expiry, new Date('2026-01-01T15:00:00.000Z'))).toBe(true);
    });

    it('does not flag a donation with hours to spare', () => {
      expect(isUrgent(expiry, new Date('2026-01-01T11:00:00.000Z'))).toBe(false);
    });

    it('does not flag an already expired donation as urgent', () => {
      const now = new Date('2026-01-01T17:00:00.000Z');
      expect(isUrgent(expiry, now)).toBe(false);
      expect(isExpired(expiry, now)).toBe(true);
    });
  });
});
