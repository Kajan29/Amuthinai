import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import i18n from '@/i18n';
import type { Language } from '@/types';

const STORAGE_KEY = 'amuthinai.language';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  restore: () => Promise<void>;
}

/** NFR6 — the choice is persisted so the app reopens in the user's language. */
export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en',

  async setLanguage(language) {
    await AsyncStorage.setItem(STORAGE_KEY, language);
    await i18n.changeLanguage(language);
    set({ language });
  },

  async restore() {
    const stored = (await AsyncStorage.getItem(STORAGE_KEY)) as Language | null;
    if (!stored) return;
    await i18n.changeLanguage(stored);
    set({ language: stored });
  },
}));
