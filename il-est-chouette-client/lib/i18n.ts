import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import fr from '@/locales/fr.json';
import en from '@/locales/en.json';
import es from '@/locales/es.json';

const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'fr';
const supportedLangs = ['fr', 'en', 'es'];
const fallback = supportedLangs.includes(deviceLang) ? deviceLang : 'fr';

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    es: { translation: es },
  },
  lng: fallback,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export default i18n;
export { supportedLangs };
