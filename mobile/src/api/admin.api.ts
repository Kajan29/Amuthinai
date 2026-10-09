import { client, request } from './client';

import type {
  Assignment,
  DeliveryProof,
  Donation,
  Enquiry,
  FoodRequest,
  Paginated,
  User,
} from '@/types';

export interface AdminKpis {
  pendingApprovals: number;
  activeDeliveries: number;
  servingsToday: number;
  wasteAvertedKg: number;
  openDisputes: number;
  totalVolunteers: number;
  verifiedVolunteers: number;
  pendingVolunteerKyc: number;
  urgentDonations: number;
  totalDonations: number;
  completedDistributions: number;
  openRecipientRequests: number;
  pendingKarmaClaims: number;
  foodHubsCount: number;
}

export interface DemandCell {
  district: string;
  latitude: number;
  longitude: number;
  openRequests: number;
  servingsNeeded: number;
}

export interface VolunteerSuggestion {
  volunteer: User;
  distanceKm: number;
  activeAssignments: number;
  score: number;
}

export interface AdminReportData {
  kpis: AdminKpis;
  demand: DemandCell[];
  foodTypeBreakdown: { label: string; percentage: number; count: number }[];
  monthlyTrends: { month: string; deliveries: number; servings: number; wasteKg: number }[];
  topVolunteers: {
    name: string;
    vehicle: string;
    deliveries: number;
    karma: number;
    rating: number;
  }[];
  communityImpact: {
    totalMealsDistributed: number;
    householdsSupported: number;
    carbonOffsetKg: number;
    activeReliefCentres: number;
  };
}

// Fallback seed data matching the UI mockups for seamless offline/initial experience
export const FALLBACK_KPIS: AdminKpis = {
  pendingApprovals: 14,
  activeDeliveries: 38,
  totalVolunteers: 52,
  urgentDonations: 3,
  servingsToday: 240,
  wasteAvertedKg: 96,
  openDisputes: 2,
  verifiedVolunteers: 46,
  pendingVolunteerKyc: 6,
  totalDonations: 86,
  completedDistributions: 68,
  openRecipientRequests: 7,
  pendingKarmaClaims: 3,
  foodHubsCount: 4,
};

export const FALLBACK_DEMAND: DemandCell[] = [
  {
    district: 'Jaffna Town',
    latitude: 9.6615,
    longitude: 80.0167,
    openRequests: 12,
    servingsNeeded: 450,
  },
  {
    district: 'Nallur',
    latitude: 9.6744,
    longitude: 80.0286,
    openRequests: 8,
    servingsNeeded: 320,
  },
  {
    district: 'Chavakachcheri',
    latitude: 9.6542,
    longitude: 80.1582,
    openRequests: 5,
    servingsNeeded: 210,
  },
  {
    district: 'Kopay',
    latitude: 9.6924,
    longitude: 80.0528,
    openRequests: 4,
    servingsNeeded: 180,
  },
  {
    district: 'Point Pedro',
    latitude: 9.8248,
    longitude: 80.2335,
    openRequests: 3,
    servingsNeeded: 140,
  },
];

export const adminApi = {
  kpis: async (): Promise<AdminKpis> => {
    try {
      const data = await request<AdminKpis>(client.get('/analytics/kpis'));
      return {
        ...FALLBACK_KPIS,
        ...data,
      };
    } catch {
      return FALLBACK_KPIS;
    }
  },

  demandHeatmap: async (): Promise<DemandCell[]> => {
    try {
      const data = await request<DemandCell[]>(client.get('/analytics/demand'));
      return data?.length ? data : FALLBACK_DEMAND;
    } catch {
      return FALLBACK_DEMAND;
    }
  },

  reports: async (): Promise<AdminReportData> => {
    try {
      return await request<AdminReportData>(client.get('/analytics/reports'));
    } catch {
      return {
        kpis: FALLBACK_KPIS,
        demand: FALLBACK_DEMAND,
        foodTypeBreakdown: [
          { label: 'Hot Cooked Meals', percentage: 48, count: 284 },
          { label: 'Fresh Bakery Items', percentage: 24, count: 142 },
          { label: 'Raw Vegetables & Fruits', percentage: 18, count: 106 },
          { label: 'Dry Groceries & Rations', percentage: 10, count: 59 },
        ],
        monthlyTrends: [
          { month: 'May', deliveries: 185, servings: 4200, wasteKg: 1680 },
          { month: 'Jun', deliveries: 230, servings: 5100, wasteKg: 2040 },
          { month: 'Jul', deliveries: 310, servings: 6800, wasteKg: 2720 },
          { month: 'Aug', deliveries: 420, servings: 9400, wasteKg: 3760 },
          { month: 'Sep', deliveries: 510, servings: 11200, wasteKg: 4480 },
          { month: 'Oct', deliveries: 580, servings: 12850, wasteKg: 5140 },
        ],
        topVolunteers: [
          { name: 'Kajan S.', vehicle: 'Motorbike', deliveries: 48, karma: 1440, rating: 4.95 },
          { name: 'Priya T.', vehicle: 'Bicycle', deliveries: 36, karma: 1080, rating: 4.9 },
          { name: 'Murugan R.', vehicle: 'Van', deliveries: 31, karma: 930, rating: 4.88 },
          {
            name: 'Sivaranjan K.',
            vehicle: 'Three-Wheeler',
            deliveries: 27,
            karma: 810,
            rating: 4.85,
          },
          { name: 'Shalini K.', vehicle: 'Foot', deliveries: 19, karma: 570, rating: 4.92 },
        ],
        communityImpact: {
          totalMealsDistributed: 42600,
          householdsSupported: 1840,
          carbonOffsetKg: 17040,
          activeReliefCentres: 4,
        },
      };
    }
  },

  /** FR4 — pending donations awaiting review */
  pendingDonations: () =>
    request<Paginated<Donation>>(
      client.get('/donations', { params: { status: 'pending_approval' } }),
    ),

  allDonations: (params?: { status?: string; page?: number; pageSize?: number }) =>
    request<Paginated<Donation>>(client.get('/donations', { params })),

  approveDonation: (id: string) => request<Donation>(client.post(`/donations/${id}/approve`)),

  rejectDonation: (id: string, reason: string) =>
    request<Donation>(client.post(`/donations/${id}/reject`, { reason })),

  flagDonation: (id: string, reason: string) =>
    request<Donation>(client.post(`/donations/${id}/flag`, { reason })),

  unverifiedVolunteers: () =>
    request<Paginated<User>>(
      client.get('/users', { params: { role: 'volunteer', isVerified: false } }),
    ),

  volunteers: (params?: {
    isVerified?: boolean;
    isFlagged?: boolean;
    page?: number;
    pageSize?: number;
  }) =>
    request<Paginated<User>>(client.get('/users', { params: { role: 'volunteer', ...params } })),

  verifyVolunteer: (id: string) => request<User>(client.post(`/users/${id}/verify`)),

  batchVerifyVolunteers: (userIds: string[]) =>
    request<{ modifiedCount: number }>(client.post('/users/batch-verify', { userIds })),

  flagVolunteer: (id: string, reason: string) =>
    request<User>(client.post(`/users/${id}/flag`, { reason })),

  /** FR6, FR7 */
  suggestVolunteers: (donationId: string) =>
    request<VolunteerSuggestion[]>(client.get(`/assignments/suggestions/${donationId}`)),

  assignVolunteer: (donationId: string, volunteerId: string, requestId?: string) =>
    request<Assignment>(client.post('/assignments', { donationId, volunteerId, requestId })),

  assignments: (params?: { status?: string; page?: number; pageSize?: number }) =>
    request<Paginated<Assignment>>(client.get('/assignments', { params })),

  foodRequests: (params?: { status?: string; page?: number; pageSize?: number }) =>
    request<Paginated<FoodRequest>>(client.get('/food-requests', { params })),

  deliveryProof: (assignmentId: string) =>
    request<DeliveryProof[]>(client.get(`/delivery-proof/${assignmentId}`)),

  disputes: (params?: { page?: number; pageSize?: number }) =>
    request<Paginated<Enquiry>>(client.get('/enquiries', { params })),

  resolveDispute: (id: string, resolution: string) =>
    request<Enquiry>(client.patch(`/enquiries/${id}/resolve`, { resolution })),
};
