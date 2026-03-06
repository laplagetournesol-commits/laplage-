import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { translations } from './translations';

const i18n = new I18n(translations);

// Langue par défaut basée sur l'appareil, fallback FR
const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'fr';
i18n.locale = ['fr', 'es', 'en'].includes(deviceLocale) ? deviceLocale : 'fr';
i18n.enableFallback = true;
i18n.defaultLocale = 'fr';

export { i18n };
export { translations } from './translations';
export type { TranslationKey, Language } from './translations';
export { LanguageProvider, useLanguage, LANGUAGE_LABELS } from './LanguageContext';
