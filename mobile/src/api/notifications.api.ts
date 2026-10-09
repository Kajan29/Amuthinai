import { client, request } from './client';

import type { AppNotification, Paginated } from '@/types';

export const notificationsApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    request<Paginated<AppNotification> & { unread: number }>(
      client.get('/notifications', { params }),
    ),

  unreadCount: () => request<{ unread: number }>(client.get('/notifications/unread-count')),

  markRead: (id: string) => request<AppNotification>(client.patch(`/notifications/${id}/read`)),

  markAllRead: () => request<{ modifiedCount: number }>(client.post('/notifications/read-all')),
};
