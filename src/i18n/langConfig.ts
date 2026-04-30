export interface LangOption {
  code: string;
  name: string;   // native script
  flag: string;
  priority?: boolean;
}

export const LANGUAGES: LangOption[] = [
  { code: 'tr', name: 'Türkçe',      flag: '🇹🇷', priority: true },
  { code: 'en', name: 'English',     flag: '🇬🇧', priority: true },
  { code: 'fr', name: 'Français',    flag: '🇫🇷', priority: true },
  { code: 'de', name: 'Deutsch',     flag: '🇩🇪', priority: true },
  { code: 'es', name: 'Español',     flag: '🇪🇸', priority: true },
  { code: 'ru', name: 'Русский',     flag: '🇷🇺', priority: true },
  { code: 'ar', name: 'العربية',     flag: '🇸🇦', priority: true },
];

export const PRIORITY_LANGS = LANGUAGES.filter(l => l.priority);
export const OTHER_LANGS    = LANGUAGES.filter(l => !l.priority);

/** Produkt‑UI: deutsch zuerst; weitere Sprachen über Einstellungen / Profil */
export const DEFAULT_LANG = 'de';
