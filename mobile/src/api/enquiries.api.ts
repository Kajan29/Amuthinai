import { client, request } from './client';
import type { Enquiry, EnquiryCategory, EnquiryStatus, Paginated } from '@/types';

export interface CreateEnquiryPayload {
  subject: string;
  body: string;
  category?: EnquiryCategory;
  donationId?: string;
  assignmentId?: string;
  requestId?: string;
}

export const enquiriesApi = {
  create: (payload: CreateEnquiryPayload) => request<Enquiry>(client.post('/enquiries', payload)),

  /** Own enquiries for donors, volunteers and recipients; everything for admins. */
  mine: (params?: { status?: EnquiryStatus; page?: number; pageSize?: number }) =>
    request<Paginated<Enquiry>>(client.get('/enquiries', { params })),

  byId: (id: string) => request<Enquiry>(client.get(`/enquiries/${id}`)),

  respond: (id: string, message: string) =>
    request<Enquiry>(client.post(`/enquiries/${id}/responses`, { message })),
};
