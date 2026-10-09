import { client, request } from './client';

import type {
  Assignment,
  DeliveryProof,
  GeoPoint,
  Paginated,
  TaskView,
  VehicleType,
} from '@/types';

/** Kept as an alias so screens written against the old name keep compiling. */
export type NearbyTask = TaskView;

export interface ProofPayload {
  photoUrl: string;
  location: GeoPoint;
  /** FR9 — the donor's PIN at pickup, the recipient's PIN at delivery. */
  pin: string;
  quantityConfirmed?: number;
  note?: string;
}

export interface VolunteerProfilePayload {
  /** FR7 */
  vehicleType?: VehicleType;
  travelRadiusKm?: number;
  isAvailable?: boolean;
}

export const isOpenTask = (id: string) => id.startsWith('open-');

export const assignmentsApi = {
  /** FR8 — own live tasks plus unclaimed donations in the travel radius, urgent first. */
  nearby: (origin?: { latitude: number; longitude: number }) =>
    request<TaskView[]>(
      client.get('/assignments/nearby', {
        params: origin ? { lat: origin.latitude, lng: origin.longitude } : undefined,
      }),
    ),

  history: (params?: { page?: number; pageSize?: number }) =>
    request<Paginated<TaskView>>(client.get('/assignments/history', { params })),

  mine: () => request<Paginated<Assignment>>(client.get('/assignments/mine')),

  /** Full task view (donation, drop-off, contacts, proofs). Accepts `open-<donationId>` ids. */
  details: (id: string) => request<TaskView>(client.get(`/assignments/${id}/details`)),

  byId: (id: string) => request<Assignment>(client.get(`/assignments/${id}`)),

  /** Accepting an `open-` task claims it; another volunteer may have got there first (409). */
  accept: (id: string) => request<Assignment>(client.post(`/assignments/${id}/accept`)),

  decline: (id: string, reason?: string) =>
    request<{ declined: true }>(client.post(`/assignments/${id}/decline`, { reason })),

  /** FR9 */
  confirmPickup: (id: string, payload: ProofPayload) =>
    request<DeliveryProof>(client.post(`/assignments/${id}/pickup`, payload)),

  confirmDelivery: (id: string, payload: ProofPayload) =>
    request<DeliveryProof>(client.post(`/assignments/${id}/delivery`, payload)),

  updateProfile: (payload: VolunteerProfilePayload) =>
    request<void>(client.patch('/users/me/volunteer-profile', payload)),
};
