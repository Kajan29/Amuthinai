import { client, request } from './client';

import type {
  Address,
  Assignment,
  AssignmentMode,
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
  /** Set when the donor is answering a specific recipient request. */
  foodRequestId?: string;
}

/** The recipient an admin is approving a donation for. */
export interface AdminDonationRecipient {
  requestId: string;
  origin: 'request' | 'claim';
  status: string;
  name: string;
  phone: string | null;
  servingsNeeded: number;
  familySize: number | null;
  neededBy: string;
  notes: string | null;
  dietaryRequirements: string[];
  dropAddress: Address;
}

/** Admins also get the donor's contact details and the confirmed recipient. */
export interface AdminDonation extends Donation {
  donor?: { id: string; name: string; phone: string | null; email: string } | null;
  recipient?: AdminDonationRecipient | null;
}

/** What the donor sees about the recipient they are feeding. */
export interface DonationRecipientInfo {
  requestId: string;
  origin: 'request' | 'claim';
  name: string;
  /** Only shared for in-person handovers. */
  phone: string | null;
  servingsNeeded: number;
  familySize: number | null;
  neededBy: string;
  notes: string | null;
  dietaryRequirements: string[];
  areaLabel: string | null;
}

export interface DonationAssignmentInfo {
  assignment: Assignment | null;
  pickupPin: string | null;
  volunteer: { name: string; phone: string | null; vehicleType: string | null } | null;
  proofs: DeliveryProof[];
  mode?: AssignmentMode;
  deliveryMethod?: DeliveryMethod | null;
  deliveryMethodConfirmed?: boolean;
  recipient?: DonationRecipientInfo | null;
  /** Recipient self-pickup / donor self-delivery: the donor can enter the recipient's code. */
  canConfirmHandover?: boolean;
  /** Donor self-delivery: the donor can mark that they have left with the food. */
  canDepart?: boolean;
  /** Open recipient request this donation fulfills. */
  foodRequestId?: string | null;
  pickupAddress?: Address | null;
  dropAddress?: Address | null;
  routeKm?: number | null;
  etaMinutes?: number | null;
}

/** A general donation as recipients see it on their dashboard. */
export interface AvailableDonation {
  id: string;
  title: string;
  foodType: FoodType;
  servings: number;
  quantityUnit: QuantityUnit | null;
  dietaryTags: DietaryTag[];
  description: string | null;
  photoUrl: string | null;
  status: DonationStatus;
  areaLabel: string;
  pickupLocation: [number, number] | null;
  distanceKm: number | null;
  cookedAt: string;
  expiresAt: string;
  minutesLeft: number;
  isUrgent: boolean;
  donorName: string;
  preferredDeliveryMethod: DeliveryMethod | null;
}

export interface ClaimDonationPayload {
  servingsNeeded?: number;
  notes?: string;
  contactPhone?: string;
  dropAddress?: Address;
}

export interface HandoverPayload {
  pin: string;
  photoUrl?: string;
  location?: { type: 'Point'; coordinates: [number, number] };
  note?: string;
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
  /** Safe minutes left while the donation is live; null once closed. */
  minutesLeft: number | null;
  expiresAt: string;
  isUrgent: boolean;
  ridersPinged: number;
  deliveredTo: string | null;
  karmaEarned: number | null;
  listing: 'request' | 'general';
  recipientName: string | null;
  deliveryMethod: DeliveryMethod | null;
  deliveryMethodConfirmed: boolean;
  /** The donor has to act: verify the recipient's code or deliver the food. */
  awaitingDonorHandover: boolean;
}

/** A recipient request shown on the donor dashboard. */
export interface DonorOpenRequest {
  id: string;
  recipientName: string;
  servingsNeeded: number;
  familySize: number | null;
  neededBy: string;
  minutesLeft: number;
  isUrgent: boolean;
  notes: string | null;
  foodCategory: string | null;
  dietaryRequirements: string[];
  preferredHandover: 'doorstep' | 'hub_pickup';
  locationLabel: string;
  status: string;
  createdAt: string;
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

  /** A recipient request the donor is about to answer. */
  openRequest: (id: string) => request<DonorOpenRequest>(client.get(`/donor/requests/${id}`)),

  /** Recipient claims a general donation; fails with 409 if someone else got there first. */
  claim: (id: string, payload: ClaimDonationPayload = {}) =>
    request<{ donation: Donation; requestId: string }>(
      client.post(`/donations/${id}/claim`, payload),
    ),

  /** Donor self-delivery: the donor has left with the food. */
  depart: (assignmentId: string) =>
    request<Donation>(client.post(`/assignments/${assignmentId}/depart`)),

  /** Donor confirms an in-person handover with the recipient's code. */
  confirmHandover: (assignmentId: string, payload: HandoverPayload) =>
    request<DeliveryProof>(client.post(`/assignments/${assignmentId}/handover`, payload)),

  /** FR12 — tamper-evident status log. */
  timeline: (id: string) => request<StatusEvent[]>(client.get(`/donations/${id}/timeline`)),

  messages: (id: string) => request<ChatMessage[]>(client.get(`/donations/${id}/messages`)),

  sendMessage: (id: string, body: string) =>
    request<ChatMessage>(client.post(`/donations/${id}/messages`, { body })),
};
