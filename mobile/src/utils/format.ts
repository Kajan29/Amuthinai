import type { Address, GeoPoint } from '@/types';

import { toLatLng } from './geo';

export function remainingMinutes(expiresAt?: string | Date | null): number | null {
  if (!expiresAt) return null;
  return Math.round((new Date(expiresAt).getTime() - Date.now()) / 60_000);
}

export function remainingLabel(expiresAt?: string | Date | null): string {
  const minutes = remainingMinutes(expiresAt);
  if (minutes === null) return 'No deadline';
  if (minutes <= 0) return 'Expired';
  if (minutes < 60) return `Expires in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `Expires in ${hours}h ${rest}m` : `Expires in ${hours}h`;
}

export function formatClock(iso?: string | Date | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatAddress(address?: Address | null): string {
  if (!address) return 'Location pending';
  return [address.line1, address.city, address.district].filter(Boolean).join(', ');
}

export function entityId(item: { id?: string; _id?: string } | string | null | undefined): string {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return String(item.id ?? item._id ?? '');
}

export function coordsOf(address?: Address | null): { latitude: number; longitude: number } | null {
  const location = address?.location;
  if (!location?.coordinates || location.coordinates.length < 2) return null;
  return toLatLng(location as GeoPoint);
}

export function titleCase(value?: string | null): string {
  if (!value) return '';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function padMetric(value?: number | null): string {
  return String(value ?? 0).padStart(2, '0');
}

export function populatedName(value: unknown): string | null {
  if (value && typeof value === 'object' && 'name' in value && typeof (value as { name: unknown }).name === 'string') {
    return (value as { name: string }).name;
  }
  return null;
}
