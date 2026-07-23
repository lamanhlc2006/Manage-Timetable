import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import 'dayjs/locale/en';

import viTranslation from './locales/vi.json';
import enTranslation from './locales/en.json';

const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('language') || 'vi' : 'vi';

// Set dayjs locale initially
dayjs.locale(savedLanguage === 'en' ? 'en' : 'vi');

i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: viTranslation },
      en: { translation: enTranslation },
    },
    lng: savedLanguage,
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false, // React already protects against XSS
    },
  });

export const changeLanguage = (lng: 'vi' | 'en') => {
  i18n.changeLanguage(lng);
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lng);
  }
  dayjs.locale(lng === 'en' ? 'en' : 'vi');
};

export default i18n;
