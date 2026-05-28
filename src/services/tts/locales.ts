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

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((sum, pattern) => sum + (pattern.test(text) ? 1 : 0), 0);
}

/**
 * Lightweight language guess for TTS voice selection.
 * Prefers a small set of supported locales over forcing all text to German.
 */
export function inferSpeechLocaleFromText(text: string, fallbackLocale: string): string {
  const raw = text.trim();
  if (!raw) return fallbackLocale;

  const lower = raw.toLowerCase();

  const frScore = countMatches(lower, [
    /\b(bonjour|monsieur|madame|courrier|facture|paiement|veuillez|merci)\b/i,
    /[àâçéèêëîïôùûüÿœ]/i,
    /\b(le|la|les|des|une|pour|avec)\b/i,
  ]);
  const deScore = countMatches(lower, [
    /\b(sehr geehrte|frist|rechnung|betrag|behörde|dokument|zahlung|bitte)\b/i,
    /[äöüß]/i,
    /\b(der|die|das|und|mit|vom|zum)\b/i,
  ]);
  const trScore = countMatches(lower, [
    /\b(sayın|ödeme|tarih|belge|itiraz|lütfen|için|ve)\b/i,
    /[çğıİöşü]/i,
  ]);
  const enScore = countMatches(lower, [
    /\b(invoice|payment|document|deadline|please|dear|regards|amount)\b/i,
    /\b(the|and|with|for|from)\b/i,
  ]);

  const ranking: Array<{ locale: string; score: number }> = [
    { locale: 'fr-FR', score: frScore },
    { locale: 'de-DE', score: deScore },
    { locale: 'tr-TR', score: trScore },
    { locale: 'en-US', score: enScore },
  ].sort((a, b) => b.score - a.score);

  return ranking[0].score > 0 ? ranking[0].locale : fallbackLocale;
}
