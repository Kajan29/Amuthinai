import Constants from 'expo-constants';

import type { DonationStatus, FoodType, Language, Role, VehicleType } from '@/types';

export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';

export const ROLES: Role[] = ['donor', 'volunteer', 'recipient', 'admin'];

export const FOOD_TYPES: FoodType[] = ['cooked', 'raw', 'packaged', 'bakery', 'dairy', 'beverage'];

export const VEHICLE_TYPES: VehicleType[] = [
  'foot',
  'bicycle',
  'motorbike',
  'three_wheeler',
  'car',
  'van',
];

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'si', label: 'සිංහල' },
];

/** FR3 — default safe-consumption window for cooked food, in hours. */
export const DEFAULT_SAFE_HOURS = 6;

/** A donation is flagged urgent once this much of its safe window is left. */
export const URGENT_THRESHOLD_MINUTES = 90;

export const TRAVEL_RADIUS_OPTIONS_KM = [2, 5, 10, 15, 25];

/** Statuses that keep a donation on the donor's "In Transit" tab. */
export const IN_TRANSIT_STATUSES: DonationStatus[] = ['assigned', 'picked_up', 'in_transit'];

export const TERMINAL_STATUSES: DonationStatus[] = [
  'delivered',
  'rejected',
  'expired',
  'cancelled',
];

/** Ordered timeline used by StatusTimeline (FR12). */
export const DONATION_FLOW: DonationStatus[] = [
  'pending_approval',
  'approved',
  'assigned',
  'picked_up',
  'in_transit',
  'delivered',
];
