import { client, request } from './client';

import type { Language, Role, User } from '@/types';

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  language: Language;
}

/** FR1 — registration, login and role selection. */
export const authApi = {
  register: (payload: RegisterPayload) =>
    request<AuthResponse>(client.post('/auth/register', payload)),

  login: (email: string, password: string) =>
    request<AuthResponse>(client.post('/auth/login', { email, password })),

  selectRole: (role: Role) => request<User>(client.patch('/auth/role', { role })),

  me: () => request<User>(client.get('/auth/me')),

  refresh: (refreshToken: string) =>
    request<AuthResponse>(client.post('/auth/refresh', { refreshToken })),
};
