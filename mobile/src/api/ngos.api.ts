import { client, request } from './client';

import type { Ngo, Paginated } from '@/types';

export const ngosApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    request<Paginated<Ngo>>(client.get('/ngos', { params: { pageSize: 50, ...params } })),
};
