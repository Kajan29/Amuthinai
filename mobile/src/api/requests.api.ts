import { client, request } from './client';

import type { Address, Enquiry, FoodRequest, Paginated, Donation } from '@/types';

export interface CreateRequestPayload {
  servingsNeeded: number;
  neededBy: string;
  notes?: string;
  /** FR5 — pinned on the map by the recipient. */
  dropAddress: Address;
}

export interface CreateEnquiryPayload {
  subject: string;
  body: string;
  donationId?: string;
}

export interface RecipientStats {
  activeNeeds: number;
  totalRequests: number;
  mealsShared: number;
  nearbyHubs: number;
}

export const requestsApi = {
  /** FR5 */
  create: (payload: CreateRequestPayload) =>
    request<FoodRequest>(client.post('/food-requests', payload)),

  mine: () => request<Paginated<FoodRequest>>(client.get('/food-requests/mine')),

  byId: (id: string) => request<FoodRequest>(client.get(`/food-requests/${id}`)),

  update: (id: string, payload: Partial<CreateRequestPayload>) =>
    request<FoodRequest>(client.patch(`/food-requests/${id}`, payload)),

  cancel: (id: string) => request<FoodRequest>(client.post(`/food-requests/${id}/cancel`)),

  /** Recipient dashboard stats */
  stats: () => request<RecipientStats>(client.get('/food-requests/stats')),

  /** Available distributions near recipient */
  availableDistributions: (params?: { page?: number; pageSize?: number }) =>
    request<Paginated<Donation>>(client.get('/food-requests/available-distributions', { params })),

  /** Check for active food requests within radius (1km duplicate prevention) */
  nearbyActive: (lat: number, lng: number, radiusKm: number = 1) =>
    request<
      Array<{
        id: string;
        servingsNeeded: number;
        dropAddress: Address;
        status: string;
        recipientId?: { name: string; phone?: string; email?: string };
      }>
    >(client.get('/food-requests/nearby-active', { params: { lat, lng, radiusKm } })),

  /** FR12 — recipient raises a concern with the admin. */
  raiseConcern: (payload: CreateEnquiryPayload) =>
    request<Enquiry>(client.post('/enquiries', payload)),

  /** Real live food tracking details for a request */
  tracking: (requestId: string) =>
    request<RequestTrackingInfo>(client.get(`/assignments/for-request/${requestId}`)),
};

export interface RequestTrackingInfo {
  request: FoodRequest;
  assignment?: {
    id: string;
    donationId: string;
    volunteerId: string;
    status: string;
    deliveryPin?: string;
    distanceKm?: number;
    offeredAt?: string;
    acceptedAt?: string;
    completedAt?: string;
  } | null;
  volunteer?: {
    id: string;
    name: string;
    phone: string;
    vehicleType?: string;
    rating?: number;
  } | null;
  donation?: {
    id: string;
    title: string;
    pickupAddress: Address;
    servings: number;
  } | null;
}
