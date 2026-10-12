import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import enTranslations from './locales/en.json';
import daTranslations from './locales/da.json';
import psTranslations from './locales/ps.json';

// Language configurations
const resources = {
  en: {
    translation: enTranslations,
    dir: 'ltr'
  },
  da: {
    translation: daTranslations,
    dir: 'rtl'
  },
  ps: {
    translation: psTranslations,
    dir: 'rtl'
  }
};

// Configure i18next
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already safes from XSS
    }
  });

export default i18n; 