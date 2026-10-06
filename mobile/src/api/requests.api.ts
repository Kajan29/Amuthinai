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

  cancel: (id: string) => request<FoodRequest>(client.post(`/food-requests/${id}/cancel`)),

  /** Recipient dashboard stats */
  stats: () => request<RecipientStats>(client.get('/food-requests/stats')),

  /** Available distributions near recipient */
  availableDistributions: (params?: { page?: number; pageSize?: number }) =>
    request<Paginated<Donation>>(client.get('/food-requests/available-distributions', { params })),

  /** FR12 — recipient raises a concern with the admin. */
  raiseConcern: (payload: CreateEnquiryPayload) =>
    request<Enquiry>(client.post('/enquiries', payload)),
};
