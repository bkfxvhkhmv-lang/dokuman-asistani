import type { LangOption } from '@/i18n/langConfig';

export const AI_LANGUAGES: LangOption[] = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', priority: true },
  { code: 'en', name: 'English', flag: '🇬🇧', priority: true },
  { code: 'fr', name: 'Français', flag: '🇫🇷', priority: true },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', priority: true },
  { code: 'es', name: 'Español', flag: '🇪🇸', priority: true },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', priority: true },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', priority: true },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'bg', name: 'Български', flag: '🇧🇬' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
];

/** Konsistent zur App‑UI‑Standardsprache (siehe `langConfig`). */
export const DEFAULT_AI_LANG = 'de';
