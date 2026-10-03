import { client, request } from './client';

import type { Assignment, Donation, Enquiry, Paginated, User } from '@/types';

export interface AdminKpis {
  pendingApprovals: number;
  activeDeliveries: number;
  servingsToday: number;
  wasteAvertedKg: number;
  openDisputes: number;
}

/** FR8 — demand aggregated per district for the heat-map. */
export interface DemandCell {
  district: string;
  latitude: number;
  longitude: number;
  openRequests: number;
  servingsNeeded: number;
}

/** FR6, FR7 — ranked volunteer suggestions for a donation. */
export interface VolunteerSuggestion {
  volunteer: User;
  distanceKm: number;
  activeAssignments: number;
  score: number;
}

export const adminApi = {
  kpis: () => request<AdminKpis>(client.get('/analytics/kpis')),

  demandHeatmap: () => request<DemandCell[]>(client.get('/analytics/demand')),

  /** FR4 */
  pendingDonations: () =>
    request<Paginated<Donation>>(
      client.get('/donations', { params: { status: 'pending_approval' } }),
    ),

  approveDonation: (id: string) => request<Donation>(client.post(`/donations/${id}/approve`)),

  rejectDonation: (id: string, reason: string) =>
    request<Donation>(client.post(`/donations/${id}/reject`, { reason })),

  unverifiedVolunteers: () =>
    request<Paginated<User>>(
      client.get('/users', { params: { role: 'volunteer', isVerified: false } }),
    ),

  verifyVolunteer: (id: string) => request<User>(client.post(`/users/${id}/verify`)),

  /** FR6, FR7 */
  suggestVolunteers: (donationId: string) =>
    request<VolunteerSuggestion[]>(client.get(`/assignments/suggestions/${donationId}`)),

  assignVolunteer: (donationId: string, volunteerId: string, requestId?: string) =>
    request<Assignment>(client.post('/assignments', { donationId, volunteerId, requestId })),

  disputes: () => request<Paginated<Enquiry>>(client.get('/enquiries')),

  resolveDispute: (id: string, resolution: string) =>
    request<Enquiry>(client.patch(`/enquiries/${id}/resolve`, { resolution })),
};
