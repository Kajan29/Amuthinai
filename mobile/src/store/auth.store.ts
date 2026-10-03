import { create } from 'zustand';

import { secureStorage } from '@/services/secureStorage';
import type { Role, User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  /** False until the stored token has been read back from SecureStore. */
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
    await secureStorage.saveTokens(accessToken, refreshToken);
    set({ user, accessToken, isReady: true });
  },

  async signOut() {
    await secureStorage.clear();
    set({ user: null, accessToken: null, isReady: true });
  },

  setUser(user) {
    set({ user });
  },

  async restore() {
    const accessToken = await secureStorage.getAccessToken();
    set({ accessToken, isReady: true });
  },
}));

/** Route group each role lands on after authentication. */
export const HOME_ROUTE: Record<Role, string> = {
  donor: '/(donor)/dashboard',
  volunteer: '/(volunteer)/dashboard',
  recipient: '/(recipient)/dashboard',
  admin: '/(admin)/dashboard',
};
