import Constants from 'expo-constants';

import type { DonationStatus, FoodType, Language, Role, VehicleType } from '@/types';

function publicEnv(name: string): string {
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess;
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  return extra?.[name] ?? '';
}

export const API_URL: string =
  publicEnv('EXPO_PUBLIC_API_URL') ||
  (Constants.expoConfig?.hostUri
    ? `http://${Constants.expoConfig.hostUri.split(':')[0]}:3000/api/v1`
    : 'http://localhost:3000/api/v1');

export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';

export const MAPBOX_ACCESS_TOKEN: string = publicEnv('EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN');

export const CLOUDINARY_CLOUD_NAME: string =
  publicEnv('EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME') || 'rrotphpj';

export const CLOUDINARY_UPLOAD_PRESET: string =
  publicEnv('EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET') || 'amuthinai_unsigned';

export const ROLES: Role[] = ['donor', 'volunteer', 'recipient', 'admin'];

/** Seed accounts from `backend` `npm run seed` — used by Advanced Login. */
export const DEMO_PASSWORD = 'amuthinai123';

export const DEMO_ACCOUNTS: Record<Role, { email: string; name: string }> = {
  donor: { email: 'donor@amuthinai.lk', name: 'Donor' },
  volunteer: { email: 'volunteer@amuthinai.lk', name: 'Volunteer' },
  recipient: { email: 'recipient@amuthinai.lk', name: 'Recipient' },
  admin: { email: 'admin@amuthinai.lk', name: 'Admin' },
};

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

/** FR3 — upper bound on the safe-consumption window a donor may declare. */
export const MAX_SAFE_HOURS: Record<FoodType, number> = {
  cooked: 6,
  raw: 24,
  packaged: 72,
  bakery: 24,
  dairy: 12,
  beverage: 12,
};

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

// Export images
export { images, logo, onboardingImages } from './images';
