import { client, request } from './client';

import type {
  Address,
  ChatMessage,
  Donation,
  DonationStatus,
  FoodType,
  Paginated,
  StatusEvent,
} from '@/types';

export interface CreateDonationPayload {
  title: string;
  foodType: FoodType;
  servings: number;
  description?: string;
  photoUrls: string[];
  /** FR3 */
  cookedAt: string;
  safeForHours: number;
  pickupAddress: Address;
}

export interface DonationQuery {
  status?: DonationStatus | DonationStatus[];
  page?: number;
  pageSize?: number;
}

export interface DonorStats {
  totalDonations: number;
  servingsShared: number;
  karmaPoints: number;
}

export const donationsApi = {
  /** FR2, FR3 */
  create: (payload: CreateDonationPayload) => request<Donation>(client.post('/donations', payload)),

  list: (query: DonationQuery = {}) =>
    request<Paginated<Donation>>(client.get('/donations', { params: query })),

  byId: (id: string) => request<Donation>(client.get(`/donations/${id}`)),

  cancel: (id: string) => request<Donation>(client.post(`/donations/${id}/cancel`)),

  stats: () => request<DonorStats>(client.get('/donations/stats')),

  /** FR12 — tamper-evident status log. */
  timeline: (id: string) => request<StatusEvent[]>(client.get(`/donations/${id}/timeline`)),

  messages: (id: string) => request<ChatMessage[]>(client.get(`/donations/${id}/messages`)),

  sendMessage: (id: string, body: string) =>
    request<ChatMessage>(client.post(`/donations/${id}/messages`, { body })),
};
