import { client, request } from './client';

import type {
  Address,
  Assignment,
  ChatMessage,
  DeliveryProof,
  Donation,
  Enquiry,
  EnquiryStatus,
  FoodRequest,
  Ngo,
  Paginated,
  Role,
  StatusEvent,
  TaskRequestInfo,
  TaskView,
  User,
} from '@/types';

import type { AdminDonation } from './donations.api';

export interface AdminKpis {
  pendingApprovals: number;
  activeDeliveries: number;
  activePickups: number;
  activeAssignments: number;
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
  unmetServings: number;
  expiredDonations: number;
  foodHubsCount: number;
}

export interface DemandCell {
  district: string;
  latitude: number;
  longitude: number;
  openRequests: number;
  servingsNeeded: number;
}

export interface UnfulfilledArea {
  area: string;
  open: number;
  matched: number;
  overdue: number;
  servingsNeeded: number;
}

export interface VolunteerSuggestion {
  volunteer: User;
  distanceKm: number;
  activeAssignments: number;
  score: number;
}

export interface AssignmentOptions {
  donation: Donation;
  volunteers: VolunteerSuggestion[];
  requests: (TaskRequestInfo & { distanceKm: number })[];
  ngos: { id: string; name: string; contactPhone: string; address: Address; distanceKm: number }[];
  currentAssignment: Assignment | null;
}

export interface MonitoredTask extends TaskView {
  volunteer: { id: string; name: string; phone: string | null; vehicleType: string | null } | null;
  alerts: string[];
  isDelayed: boolean;
}

export interface EnquiryEvidence {
  enquiry: Enquiry;
  raiser: { id: string; name: string; role: Role; phone: string | null; email: string } | null;
  donation: Donation | null;
  request: FoodRequest | null;
  assignment: Assignment | null;
  volunteer: { id: string; name: string; phone: string | null; vehicleType: string | null } | null;
  proofs: DeliveryProof[];
  timeline: StatusEvent[];
  messages: ChatMessage[];
}

/** Populated rows from `GET /assignments`. */
export interface AdminAssignmentRow
  extends Omit<Assignment, 'donationId' | 'volunteerId' | 'requestId' | 'ngoId'> {
  donationId: Donation | null;
  volunteerId: User | null;
  requestId: FoodRequest | null;
  ngoId?: { id: string; name: string; contactPhone: string } | null;
}

export interface AdminReportData {
  kpis: AdminKpis;
  demand: DemandCell[];
  unfulfilledByArea: UnfulfilledArea[];
  foodTypeBreakdown: { label: string; percentage: number; count: number }[];
  monthlyTrends: { month: string; deliveries: number; servings: number; wasteKg: number }[];
  topVolunteers: {
    id: string;
    name: string;
    vehicle: string;
    deliveries: number;
    karma: number;
  }[];
  communityImpact: {
    totalMealsDistributed: number;
    totalDeliveries: number;
    householdsSupported: number;
    wasteAvertedKg: number;
    carbonOffsetKg: number;
    activeReliefCentres: number;
  };
}

export const adminApi = {
  kpis: () => request<AdminKpis>(client.get('/analytics/kpis')),

  demandHeatmap: () => request<DemandCell[]>(client.get('/analytics/demand')),

  reports: () => request<AdminReportData>(client.get('/analytics/reports')),

  /** FR4 — pending donations awaiting review */
  pendingDonations: () =>
    request<Paginated<AdminDonation>>(
      client.get('/donations', { params: { status: 'pending_approval' } }),
    ),

  allDonations: (params?: { status?: string; page?: number; pageSize?: number }) =>
    request<Paginated<AdminDonation>>(client.get('/donations', { params })),

  donation: (id: string) => request<AdminDonation>(client.get(`/donations/${id}`)),

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

  /** User management across every role. */
  users: (params?: {
    role?: Role;
    isActive?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => request<Paginated<User>>(client.get('/users', { params })),

  changeRole: (id: string, role: Role) =>
    request<User>(client.patch(`/users/${id}/role`, { role })),

  setActive: (id: string, isActive: boolean) =>
    request<User>(client.patch(`/users/${id}/status`, { isActive })),

  verifyVolunteer: (id: string) => request<User>(client.post(`/users/${id}/verify`)),

  batchVerifyVolunteers: (userIds: string[]) =>
    request<{ modifiedCount: number }>(client.post('/users/batch-verify', { userIds })),

  flagVolunteer: (id: string, reason: string) =>
    request<User>(client.post(`/users/${id}/flag`, { reason })),

  /** FR6, FR7 */
  suggestVolunteers: (donationId: string) =>
    request<VolunteerSuggestion[]>(client.get(`/assignments/suggestions/${donationId}`)),

  /** Volunteers, nearby open requests and partner NGOs for the assign screen. */
  assignmentOptions: (donationId: string) =>
    request<AssignmentOptions>(client.get(`/assignments/options/${donationId}`)),

  assignVolunteer: (donationId: string, volunteerId: string, requestId?: string) =>
    request<Assignment>(client.post('/assignments', { donationId, volunteerId, requestId })),

  reassign: (assignmentId: string, volunteerId: string, reason?: string) =>
    request<Assignment>(
      client.post(`/assignments/${assignmentId}/reassign`, { volunteerId, reason }),
    ),

  /** NGO fallback when no volunteer is available. */
  assignToNgo: (donationId: string, ngoId: string, requestId?: string) =>
    request<Assignment>(client.post('/assignments/ngo', { donationId, ngoId, requestId })),

  completeNgo: (assignmentId: string) =>
    request<Assignment>(client.post(`/assignments/${assignmentId}/ngo-complete`)),

  assignments: (params?: { status?: string; page?: number; pageSize?: number }) =>
    request<Paginated<AdminAssignmentRow>>(client.get('/assignments', { params })),

  /** Live deliveries with delay and urgency alerts. */
  monitor: () => request<MonitoredTask[]>(client.get('/assignments/monitor')),

  taskDetails: (assignmentId: string) =>
    request<TaskView>(client.get(`/assignments/${assignmentId}/details`)),

  foodRequests: (params?: { status?: string; page?: number; pageSize?: number }) =>
    request<Paginated<FoodRequest>>(client.get('/food-requests', { params })),

  deliveryProof: (assignmentId: string) =>
    request<DeliveryProof[]>(client.get(`/delivery-proof/${assignmentId}`)),

  disputes: (params?: { status?: EnquiryStatus; page?: number; pageSize?: number }) =>
    request<Paginated<Enquiry>>(client.get('/enquiries', { params })),

  disputeEvidence: (id: string) =>
    request<EnquiryEvidence>(client.get(`/enquiries/${id}/evidence`)),

  respondDispute: (id: string, message: string) =>
    request<Enquiry>(client.post(`/enquiries/${id}/responses`, { message })),

  setDisputeStatus: (id: string, status: EnquiryStatus) =>
    request<Enquiry>(client.patch(`/enquiries/${id}/status`, { status })),

  resolveDispute: (id: string, resolution: string) =>
    request<Enquiry>(client.patch(`/enquiries/${id}/resolve`, { resolution })),

  ngos: (params?: { page?: number; pageSize?: number }) =>
    request<Paginated<Ngo>>(client.get('/ngos', { params })),
};
