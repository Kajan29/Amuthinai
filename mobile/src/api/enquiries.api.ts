import { client, request } from './client';
import type { Enquiry, Paginated } from '@/types';

export interface CreateEnquiryPayload {
  subject: string;
  body: string;
  donationId?: string;
  assignmentId?: string;
}

// In-memory fallback cache for offline/demo concerns raised during session
let localEnquiriesCache: Enquiry[] = [
  {
    id: 'enq-sample-vol-1',
    raisedBy: 'user-vol-1',
    assignmentId: 'asgn-vol-402',
    subject: '[Traffic Delay] Order #VOL-402',
    body: 'Selected Order: #VOL-402\nIssue: Traffic Delay\nDropoff: St. John\'s Community Hub\nDetails: Heavy congestion near Temple road due to festival procession. Anticipating 15 minute delay.',
    status: 'in_review',
    resolution: 'Dispatch notified recipient center Sister Mary to expect delayed arrival.',
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
];

export const enquiriesApi = {
  create: async (payload: CreateEnquiryPayload): Promise<Enquiry> => {
    try {
      const created = await request<Enquiry>(client.post('/enquiries', payload));
      localEnquiriesCache.unshift(created);
      return created;
    } catch {
      // Offline / fallback support
      const mockCreated: Enquiry = {
        id: `enq-${Date.now()}`,
        raisedBy: 'me',
        donationId: payload.donationId,
        assignmentId: payload.assignmentId,
        subject: payload.subject,
        body: payload.body,
        status: 'open',
        createdAt: new Date().toISOString(),
      };
      localEnquiriesCache.unshift(mockCreated);
      return mockCreated;
    }
  },

  mine: async (): Promise<Paginated<Enquiry>> => {
    try {
      const result = await request<Paginated<Enquiry>>(client.get('/enquiries'));
      if (result && Array.isArray(result.items)) {
        return result;
      }
      return {
        items: localEnquiriesCache,
        total: localEnquiriesCache.length,
        page: 1,
        pageSize: 20,
      };
    } catch {
      return {
        items: localEnquiriesCache,
        total: localEnquiriesCache.length,
        page: 1,
        pageSize: 20,
      };
    }
  },
};
