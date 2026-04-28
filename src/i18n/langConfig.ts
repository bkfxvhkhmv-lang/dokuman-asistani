export interface LangOption {
  code: string;
  name: string;   // native script
  flag: string;
  priority?: boolean;
}

export const LANGUAGES: LangOption[] = [
  { code: 'tr', name: 'Türkçe',      flag: '🇹🇷', priority: true },
  { code: 'de', name: 'Deutsch',     flag: '🇩🇪', priority: true },
  { code: 'en', name: 'English',     flag: '🇬🇧', priority: true },
  { code: 'ar', name: 'العربية',     flag: '🇸🇦', priority: true },
  { code: 'uk', name: 'Українська',  flag: '🇺🇦', priority: true },
  { code: 'ru', name: 'Русский',     flag: '🇷🇺', priority: true },
  { code: 'fr', name: 'Français',    flag: '🇫🇷', priority: true },
  { code: 'es', name: 'Español',     flag: '🇪🇸' },
  { code: 'pl', name: 'Polski',      flag: '🇵🇱' },
  { code: 'it', name: 'Italiano',    flag: '🇮🇹' },
  { code: 'ro', name: 'Română',      flag: '🇷🇴' },
  { code: 'hr', name: 'Hrvatski',    flag: '🇭🇷' },
  { code: 'sr', name: 'Srpski',      flag: '🇷🇸' },
  { code: 'bs', name: 'Bosanski',    flag: '🇧🇦' },
  { code: 'bg', name: 'Български',   flag: '🇧🇬' },
  { code: 'el', name: 'Ελληνικά',    flag: '🇬🇷' },
  { code: 'fa', name: 'فارسی',       flag: '🇮🇷' },
  { code: 'vi', name: 'Tiếng Việt',  flag: '🇻🇳' },
  { code: 'ku', name: 'Kurdî',       flag: '🏳️' },
  { code: 'so', name: 'Soomaali',    flag: '🇸🇴' },
  { code: 'ti', name: 'ትግርኛ',       flag: '🇪🇷' },
  { code: 'am', name: 'አማርኛ',       flag: '🇪🇹' },
];

export const PRIORITY_LANGS = LANGUAGES.filter(l => l.priority);
export const OTHER_LANGS    = LANGUAGES.filter(l => !l.priority);

export const DEFAULT_LANG = 'tr';
