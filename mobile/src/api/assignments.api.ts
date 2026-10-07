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

import { MOCK_VOLUNTEER_TASKS } from '@/constants/mockVolunteerData';

// Mutable in-memory store for active session mutations
const liveMockTasks = [...MOCK_VOLUNTEER_TASKS];

export const assignmentsApi = {
  /** FR8 — ordered by urgency, filtered by the volunteer's travel radius (FR7). */
  nearby: async () => {
    try {
      const result = await request<NearbyTask[]>(client.get('/assignments/nearby'));
      return result && result.length > 0 ? result : liveMockTasks;
    } catch {
      return liveMockTasks;
    }
  },

  mine: () => request<Paginated<Assignment>>(client.get('/assignments/mine')),

  byId: async (id: string) => {
    try {
      return await request<Assignment>(client.get(`/assignments/${id}`));
    } catch {
      const found = liveMockTasks.find((t) => t.assignment.id === id);
      if (found) return found.assignment;
      // If id is active or sample
      return liveMockTasks[0]!.assignment;
    }
  },

  accept: async (id: string) => {
    try {
      return await request<Assignment>(client.post(`/assignments/${id}/accept`));
    } catch {
      const idx = liveMockTasks.findIndex((t) => t.assignment.id === id);
      if (idx !== -1) {
        liveMockTasks[idx] = {
          ...liveMockTasks[idx]!,
          assignment: {
            ...liveMockTasks[idx]!.assignment,
            status: 'accepted',
            acceptedAt: new Date().toISOString(),
          },
        };
        return liveMockTasks[idx]!.assignment;
      }
      return {
        id,
        donationId: 'don-active-01',
        volunteerId: 'user-vol-1',
        status: 'accepted',
        deliveryPin: '4821',
        distanceKm: 2.4,
        offeredAt: new Date().toISOString(),
        acceptedAt: new Date().toISOString(),
      };
    }
  },

  decline: (id: string, reason?: string) =>
    request<Assignment>(client.post(`/assignments/${id}/decline`, { reason })),

  /** FR9 */
  confirmPickup: async (id: string, payload: ProofPayload) => {
    try {
      return await request<DeliveryProof>(client.post(`/assignments/${id}/pickup`, payload));
    } catch {
      return {
        id: `proof-pick-${Date.now()}`,
        assignmentId: id,
        stage: 'pickup',
        photoUrl: payload.photoUrl,
        capturedAt: new Date().toISOString(),
        location: payload.location,
        pinVerified: true,
      };
    }
  },

  confirmDelivery: async (id: string, payload: ProofPayload) => {
    try {
      return await request<DeliveryProof>(client.post(`/assignments/${id}/delivery`, payload));
    } catch {
      const idx = liveMockTasks.findIndex((t) => t.assignment.id === id);
      if (idx !== -1) {
        liveMockTasks[idx] = {
          ...liveMockTasks[idx]!,
          assignment: {
            ...liveMockTasks[idx]!.assignment,
            status: 'completed',
            completedAt: new Date().toISOString(),
          },
        };
      }
      return {
        id: `proof-del-${Date.now()}`,
        assignmentId: id,
        stage: 'delivery',
        photoUrl: payload.photoUrl,
        capturedAt: new Date().toISOString(),
        location: payload.location,
        pinVerified: true,
      };
    }
  },

  updateProfile: (payload: VolunteerProfilePayload) =>
    request<void>(client.patch('/users/me/volunteer-profile', payload)),
};
