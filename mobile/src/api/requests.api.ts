import { client, request } from './client';

import type { Address, Enquiry, FoodRequest, Paginated } from '@/types';

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

export const requestsApi = {
  /** FR5 */
  create: (payload: CreateRequestPayload) =>
    request<FoodRequest>(client.post('/food-requests', payload)),

  mine: () => request<Paginated<FoodRequest>>(client.get('/food-requests/mine')),

  byId: (id: string) => request<FoodRequest>(client.get(`/food-requests/${id}`)),

  cancel: (id: string) => request<FoodRequest>(client.post(`/food-requests/${id}/cancel`)),

  /** FR12 — recipient raises a concern with the admin. */
  raiseConcern: (payload: CreateEnquiryPayload) =>
    request<Enquiry>(client.post('/enquiries', payload)),
};
