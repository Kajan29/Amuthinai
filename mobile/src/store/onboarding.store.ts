import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface OnboardingState {
  hasSeenOnboarding: boolean;
  isReady: boolean;
  markOnboardingSeen: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  restore: () => Promise<void>;
}

const STORAGE_KEY = 'amuthinai:onboarding';

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      isReady: false,

      markOnboardingSeen: async () => {
        set({ hasSeenOnboarding: true });
      },

      resetOnboarding: async () => {
        await AsyncStorage.removeItem(STORAGE_KEY);
        set({ hasSeenOnboarding: false });
      },

      restore: async () => {
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) {
            const { state } = JSON.parse(stored);
            set({ hasSeenOnboarding: state.hasSeenOnboarding ?? false, isReady: true });
          } else {
            set({ isReady: true });
          }
        } catch (error) {
          console.error('Failed to restore onboarding state:', error);
          set({ isReady: true });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
