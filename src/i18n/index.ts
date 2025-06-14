import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import ja from './locales/ja.json';

export const defaultNS = 'translation';
export const resources = {
  en: {
    translation: en,
  },
  ja: {
    translation: ja,
  },
} as const;

// Supported languages configuration
export const supportedLanguages = {
  en: 'English',
  ja: '日本語'
} as const;

export type Language = keyof typeof supportedLanguages;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: false,
    fallbackLng: 'en',
    defaultNS,
    resources,
    
    // Language detection disabled - controlled by app settings
    detection: {
      order: [],
      caches: [],
    },

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    // Enable plural support
    pluralSeparator: '_',
    
    // Namespace configuration for future scalability
    ns: ['translation'],

    // Return key if translation is missing (for development)
    returnKeyIfNamespace: false,
    returnEmptyString: false,
  });

export default i18n;