/** expo-speech `language` kodları — UI/app dil kodundan eşleme */
export const TTS_LANG_TO_LOCALE: Record<string, string> = {
  tr: 'tr-TR',
  de: 'de-DE',
  en: 'en-US',
  ar: 'ar-SA',
  uk: 'uk-UA',
  ru: 'ru-RU',
  fr: 'fr-FR',
  es: 'es-ES',
  pl: 'pl-PL',
  it: 'it-IT',
  hr: 'hr-HR',
  ro: 'ro-RO',
  bg: 'bg-BG',
  el: 'el-GR',
  vi: 'vi-VN',
  fa: 'fa-IR',
};

export function ttsLocaleForAppLang(lang: string | undefined, fallback = 'de-DE'): string {
  if (!lang) return fallback;
  return TTS_LANG_TO_LOCALE[lang] ?? fallback;
}
