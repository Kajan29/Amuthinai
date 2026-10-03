import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import si from './locales/si.json';
import ta from './locales/ta.json';

/** NFR6 — English, Tamil and Sinhala are supported on every screen. */
export const resources = {
  en: { translation: en },
  ta: { translation: ta },
  si: { translation: si },
} as const;

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
const fallback = deviceLanguage in resources ? deviceLanguage : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: fallback,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
