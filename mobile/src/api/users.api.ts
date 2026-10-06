import { client, request } from './client';

import type { User } from '@/types';

export interface UpdateUserPayload {
  name?: string;
  phone?: string;
  language?: 'en' | 'ta' | 'si';
}

export const usersApi = {
  me: () => request<User>(client.get('/users/me')),

  update: (payload: UpdateUserPayload) => request<User>(client.patch('/users/me', payload)),
};
