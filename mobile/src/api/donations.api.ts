import { client, request } from './client';

import type {
  Address,
  Assignment,
  ChatMessage,
  DeliveryProof,
  DeliveryMethod,
  DietaryTag,
  Donation,
  DonationStatus,
  FoodType,
  HandlingInstruction,
  PickupSource,
  QuantityUnit,
  Paginated,
  StatusEvent,
} from '@/types';

export interface CreateDonationPayload {
  title: string;
  foodType: FoodType;
  servings: number;
  quantityUnit?: QuantityUnit;
  dietaryTags?: DietaryTag[];
  foodSafetyVerified?: boolean;
  description?: string;
  photoUrls: string[];
  pickupSource?: PickupSource;
  /** FR3 */
  readyFrom?: string;
  consumeBefore?: string;
  handling?: HandlingInstruction[];
  deliveryMethod?: DeliveryMethod;
  handoverInstructions?: string;
  cookedAt: string;
  safeForHours: number;
  pickupAddress: Address;
  packagingType?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
}

/** Admins also get the donor's contact details. */
export interface AdminDonation extends Donation {
  donor?: { id: string; name: string; phone: string | null; email: string } | null;
}

export interface DonationAssignmentInfo {
  assignment: Assignment | null;
  pickupPin: string | null;
  volunteer: { name: string; phone: string | null; vehicleType: string | null } | null;
  proofs: DeliveryProof[];
  /** Open recipient request this donation fulfills. */
  foodRequestId?: string | null;
  pickupAddress?: Address | null;
  dropAddress?: Address | null;
  routeKm?: number | null;
  etaMinutes?: number | null;
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

export interface DonorDashboardDonation {
  id: string;
  title: string;
  status: DonationStatus;
  photoUrl: string | null;
  quantityLabel: string;
  locationLabel: string;
  cookedAt: string;
  pickup: { latitude: number; longitude: number } | null;
  volunteer: { name: string; minutesAway: number } | null;
  expiresInMinutes: number | null;
  ridersPinged: number;
  deliveredTo: string | null;
  karmaEarned: number | null;
}

export interface DonorOpenRequest {
  id: string;
  recipientName: string;
  servingsNeeded: number;
  neededBy: string;
  notes: string | null;
  locationLabel: string;
}

export interface DonorDashboard {
  donor: {
    firstName: string;
    hub: string;
    isVerified: boolean;
    activeContributions: number;
    hasAlerts: boolean;
  };
  stats: {
    mealsShared: number;
    familiesFed: number;
    karmaPoints: number;
  };
  donations: DonorDashboardDonation[];
  openRequests: DonorOpenRequest[];
}

export const donationsApi = {
  /** FR2, FR3 */
  create: (payload: CreateDonationPayload) => request<Donation>(client.post('/donations', payload)),

  list: (query: DonationQuery = {}) =>
    request<Paginated<Donation>>(client.get('/donations', { params: query })),

  byId: (id: string) => request<AdminDonation>(client.get(`/donations/${id}`)),

  /** Who is collecting this donation, plus the pickup PIN while it is still waiting. */
  assignment: (id: string) =>
    request<DonationAssignmentInfo>(client.get(`/assignments/for-donation/${id}`)),

  cancel: (id: string) => request<Donation>(client.post(`/donations/${id}/cancel`)),

  stats: () => request<DonorStats>(client.get('/donations/stats')),

  /** Donor home screen: greeting stats and the cards under the tabs. */
  dashboard: () => request<DonorDashboard>(client.get('/donor/dashboard')),

  /** FR12 — tamper-evident status log. */
  timeline: (id: string) => request<StatusEvent[]>(client.get(`/donations/${id}/timeline`)),

  messages: (id: string) => request<ChatMessage[]>(client.get(`/donations/${id}/messages`)),

  sendMessage: (id: string, body: string) =>
    request<ChatMessage>(client.post(`/donations/${id}/messages`, { body })),
};
