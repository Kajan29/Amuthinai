import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { authApi, type RegisterPayload, type ForgotPasswordPayload, type VerifyOtpPayload, type ResetPasswordPayload } from '@/api/auth.api';
import { queryClient } from '@/api/queryClient';
import { useAuthStore } from '@/store/auth.store';
import type { Role } from '@/types';

/** Single entry point for authentication so screens never touch the store directly. */
export function useAuth() {
  const { t } = useTranslation();
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

  const logout = useCallback(async () => {
    try {
      await signOut();
      queryClient.clear();
    } finally {
      router.replace('/(auth)/login');
    }
  }, [signOut]);

  const confirmLogout = useCallback(async () => {
    const doLogout = async () => {
      await logout();
    };

    const title = t('common.logout') || 'Logout';
    const message = t('common.logoutConfirm') || 'Are you sure you want to logout?';

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(message) : true;
      if (confirmed) {
        await doLogout();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: t('common.cancel') || 'Cancel', style: 'cancel' },
      {
        text: title,
        style: 'destructive',
        onPress: () => {
          void doLogout();
        },
      },
    ]);
  }, [logout, t]);

  return {
    user,
    role: user?.role,
    isAuthenticated: Boolean(accessToken),
    isReady,
    login,
    register,
    googleAuth,
    selectRole,
    logout,
    confirmLogout,
    forgotPassword,
    verifyOtp,
    resetPassword,
    resendVerificationOtp,
    verifyEmail,
  };
}
