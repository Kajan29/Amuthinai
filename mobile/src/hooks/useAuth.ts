import { useCallback } from 'react';

import { authApi, type RegisterPayload, type GoogleAuthPayload, type ForgotPasswordPayload, type VerifyOtpPayload, type ResetPasswordPayload } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import type { Role } from '@/types';

/** Single entry point for authentication so screens never touch the store directly. */
export function useAuth() {
  const { user, accessToken, isReady, signIn, signOut, setUser } = useAuthStore();

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password);
      await signIn(result.user, result.accessToken, result.refreshToken);
      return result.user;
    },
    [signIn],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const result = await authApi.register(payload);
      await signIn(result.user, result.accessToken, result.refreshToken);
      return result.user;
    },
    [signIn],
  );

  const googleAuth = useCallback(
    async (idToken: string, role?: Role) => {
      const result = await authApi.googleAuth({ idToken, role });
      await signIn(result.user, result.accessToken, result.refreshToken);
      return result.user;
    },
    [signIn],
  );

  /** FR1 — role is chosen after the account exists. */
  const selectRole = useCallback(
    async (role: Role) => {
      const updated = await authApi.selectRole(role);
      setUser(updated);
      return updated;
    },
    [setUser],
  );

  const forgotPassword = useCallback(async (payload: ForgotPasswordPayload) => {
    return await authApi.forgotPassword(payload);
  }, []);

  const verifyOtp = useCallback(async (payload: VerifyOtpPayload) => {
    return await authApi.verifyOtp(payload);
  }, []);

  const resetPassword = useCallback(async (payload: ResetPasswordPayload) => {
    return await authApi.resetPassword(payload);
  }, []);

  const resendVerificationOtp = useCallback(async (email: string) => {
    return await authApi.resendVerificationOtp(email);
  }, []);

  const verifyEmail = useCallback(async (email: string, otp: string) => {
    return await authApi.verifyEmail({ email, otp });
  }, []);

  return {
    user,
    role: user?.role,
    isAuthenticated: Boolean(accessToken),
    isReady,
    login,
    register,
    googleAuth,
    selectRole,
    logout: signOut,
    forgotPassword,
    verifyOtp,
    resetPassword,
    resendVerificationOtp,
    verifyEmail,
  };
}
