import { create } from 'zustand';

import { authApi } from '@/api/auth.api';
import { secureStorage } from '@/services/secureStorage';
import type { Role, User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  /** False until the stored token and user have been read back from storage. */
  isReady: boolean;

  signIn: (user: User, accessToken: string, refreshToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
  restore: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isReady: false,

  async signIn(user, accessToken, refreshToken) {
    await Promise.all([
      secureStorage.saveTokens(accessToken, refreshToken),
      secureStorage.saveUser(user),
    ]);
    set({ user, accessToken, isReady: true });
  },

  async signOut() {
    await secureStorage.clear();
    set({ user: null, accessToken: null, isReady: true });
  },

  setUser(user) {
    void secureStorage.saveUser(user);
    set({ user });
  },

  async restore() {
    try {
      const [accessToken, storedUser] = await Promise.all([
        secureStorage.getAccessToken(),
        secureStorage.getUser(),
      ]);

      if (!accessToken) {
        set({ user: null, accessToken: null, isReady: true });
        return;
      }

      // Immediately restore stored session so the user remains on their dashboard on page refresh
      set({ user: storedUser, accessToken, isReady: true });

      // In the background, fetch fresh user data to verify token and update state
      try {
        const freshUser = await authApi.me();
        await secureStorage.saveUser(freshUser);
        set({ user: freshUser });
      } catch (err: any) {
        if (err?.status === 401 || err?.statusCode === 401) {
          await secureStorage.clear();
          set({ user: null, accessToken: null, isReady: true });
        }
      }
    } catch {
      set({ user: null, accessToken: null, isReady: true });
    }
  },
}));

/** Route group each role lands on after authentication. */
export const HOME_ROUTE: Record<Role, string> = {
  donor: '/(donor)/dashboard',
  volunteer: '/(volunteer)/dashboard',
  recipient: '/(recipient)/dashboard',
  admin: '/(admin)/dashboard',
};
