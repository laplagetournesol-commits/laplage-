import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n } from './index';
import type { Language } from './translations';

const LANG_KEY = 'tournesol_language';

const LANGUAGE_LABELS: Record<Language, string> = {
  fr: 'Français',
  es: 'Español',
  en: 'English',
};

type LanguageContextType = {
  locale: Language;
  setLanguage: (lang: Language) => void;
  languageLabel: string;
};

const LanguageContext = createContext<LanguageContextType>({
  locale: 'fr',
  setLanguage: () => {},
  languageLabel: 'Français',
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Language>(i18n.locale as Language);

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved && ['fr', 'es', 'en'].includes(saved)) {
        i18n.locale = saved;
        setLocale(saved as Language);
      }
    });
  }, []);

  const setLanguage = (lang: Language) => {
    i18n.locale = lang;
    setLocale(lang);
    AsyncStorage.setItem(LANG_KEY, lang);
  };

  return (
    <LanguageContext.Provider
      value={{ locale, setLanguage, languageLabel: LANGUAGE_LABELS[locale] }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
export { LANGUAGE_LABELS };
