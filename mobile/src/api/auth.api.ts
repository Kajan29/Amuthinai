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
  role: Role;
}

export interface GoogleAuthPayload {
  idToken: string;
  role?: Role;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
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

  // Google OAuth
  googleAuth: (payload: GoogleAuthPayload) =>
    request<AuthResponse>(client.post('/auth/google', payload)),

  // Forgot Password Flow
  forgotPassword: (payload: ForgotPasswordPayload) =>
    request<{ message: string }>(client.post('/auth/forgot-password', payload)),

  verifyOtp: (payload: VerifyOtpPayload) =>
    request<{ message: string; valid: boolean }>(client.post('/auth/verify-otp', payload)),

  resetPassword: (payload: ResetPasswordPayload) =>
    request<{ message: string }>(client.post('/auth/reset-password', payload)),

  // Email Verification
  resendVerificationOtp: (email: string) =>
    request<{ message: string }>(client.post('/auth/resend-verification', { email })),

  verifyEmail: (payload: VerifyEmailPayload) =>
    request<{ message: string }>(client.post('/auth/verify-email', payload)),

  changePassword: (payload: ChangePasswordPayload) =>
    request<{ message: string }>(client.patch('/auth/change-password', payload)),
};
