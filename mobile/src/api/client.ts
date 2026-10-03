import axios, { AxiosError, type AxiosInstance } from 'axios';

import { API_URL } from '@/constants';
import { secureStorage } from '@/services/secureStorage';
import { useAuthStore } from '@/store/auth.store';

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

/** Error shape every screen can rely on, regardless of transport failure mode. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const client: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(async (config) => {
  const token = await secureStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    if (!error.response) {
      throw new ApiError('No connection to the server. Showing cached data where available.', 0);
    }

    const { status, data } = error.response;

    // The token is gone or stale — drop it so the router sends the user back to login.
    if (status === 401) await useAuthStore.getState().signOut();

    const messages = Array.isArray(data?.message) ? data.message : [data?.message ?? error.message];

    throw new ApiError(messages[0] ?? 'Request failed', status, messages);
  },
);

/** Unwraps the axios envelope so API modules read as plain async functions. */
export async function request<T>(promise: Promise<{ data: T }>): Promise<T> {
  const response = await promise;
  return response.data;
}
