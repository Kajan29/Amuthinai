import { useCallback } from 'react';

import { authApi, type RegisterPayload } from '@/api/auth.api';
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

  /** FR1 — role is chosen after the account exists. */
  const selectRole = useCallback(
    async (role: Role) => {
      const updated = await authApi.selectRole(role);
      setUser(updated);
      return updated;
    },
    [setUser],
  );

  return {
    user,
    role: user?.role,
    isAuthenticated: Boolean(accessToken),
    isReady,
    login,
    register,
    selectRole,
    logout: signOut,
  };
}
