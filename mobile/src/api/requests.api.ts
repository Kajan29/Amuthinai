import { client, request } from './client';

import type {
  Address,
  Assignment,
  ContactPreference,
  DeliveryProof,
  Donation,
  DonationStatus,
  Enquiry,
  FoodRequest,
  FoodType,
  Paginated,
  RequestDeliveryMethod,
  StatusEvent,
} from '@/types';

import type { CreateEnquiryPayload } from './enquiries.api';

export interface CreateRequestPayload {
  servingsNeeded: number;
  neededBy: string;
  notes?: string;
  familySize?: number;
  dietaryRequirements?: string[];
  foodCategory?: string;
  contactPreference?: ContactPreference;
  deliveryMethod?: RequestDeliveryMethod;
  contactPhone?: string;
  /** FR5 — pinned on the map by the recipient. */
  dropAddress: Address;
}

export interface RecipientStats {
  activeNeeds: number;
  totalRequests: number;
  mealsShared: number;
  nearbyHubs: number;
  fulfilled?: number;
}

export interface RequestTrackingInfo {
  request: FoodRequest;
  /** `deliveryPin` is included only for the recipient who owns the request. */
  assignment: Assignment | null;
  volunteer: {
    id: string;
    name: string;
    phone: string | null;
    vehicleType: string | null;
    completedDeliveries?: number;
  } | null;
  donation: {
    id: string;
    title: string;
    foodType: FoodType;
    pickupAddress: { city: string; district?: string };
    servings: number;
    status: DonationStatus;
    expiresAt: string;
    photoUrls: string[];
  } | null;
  routeKm: number | null;
  etaMinutes: number | null;
  proofs: DeliveryProof[];
  timeline: StatusEvent[];
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

  /** Active requests within the radius (1 km duplicate prevention). Identities are not shared. */
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

  /** Live tracking for a request, including the delivery PIN for the recipient. */
  tracking: (requestId: string) =>
    request<RequestTrackingInfo>(client.get(`/assignments/for-request/${requestId}`)),
};

export type { CreateEnquiryPayload };
