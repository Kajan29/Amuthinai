import { client, request } from './client';

import type {
  Assignment,
  DeliveryProof,
  Donation,
  GeoPoint,
  Paginated,
  VehicleType,
} from '@/types';

export interface NearbyTask {
  assignment: Assignment;
  donation: Donation;
  distanceKm: number;
  minutesLeft: number;
}

export interface ProofPayload {
  photoUrl: string;
  location: GeoPoint;
  /** FR9 — required on delivery, ignored on pickup. */
  pin?: string;
}

export interface VolunteerProfilePayload {
  /** FR7 */
  vehicleType: VehicleType;
  travelRadiusKm: number;
}

export const assignmentsApi = {
  /** FR8 — ordered by urgency, filtered by the volunteer's travel radius (FR7). */
  nearby: () => request<NearbyTask[]>(client.get('/assignments/nearby')),

  mine: () => request<Paginated<Assignment>>(client.get('/assignments/mine')),

  byId: (id: string) => request<Assignment>(client.get(`/assignments/${id}`)),

  accept: (id: string) => request<Assignment>(client.post(`/assignments/${id}/accept`)),

  decline: (id: string, reason?: string) =>
    request<Assignment>(client.post(`/assignments/${id}/decline`, { reason })),

  /** FR9 */
  confirmPickup: (id: string, payload: ProofPayload) =>
    request<DeliveryProof>(client.post(`/assignments/${id}/pickup`, payload)),

  confirmDelivery: (id: string, payload: ProofPayload) =>
    request<DeliveryProof>(client.post(`/assignments/${id}/delivery`, payload)),

  updateProfile: (payload: VolunteerProfilePayload) =>
    request<void>(client.patch('/users/me/volunteer-profile', payload)),
};
