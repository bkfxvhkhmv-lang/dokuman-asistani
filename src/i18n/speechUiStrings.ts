/**
 * TTS/UI etiketleri — uygulama dili (Profil dil tercihi).
 */

export type SpeechUiKey =
  | 'full_listen'
  | 'stop'
  | 'critical_listen'
  /** Kısaltılmış “…” yüklenirken vb. */
  | 'busy';

type Row = Record<SpeechUiKey, string>;

const de: Row = {
  full_listen:     '🔊 Volltext anhören',
  stop:            '⏹ Anhalten',
  critical_listen: '🔊 Kritische Punkte anhören',
  busy:            '…',
};

const tr: Row = {
  full_listen:     '🔊 Belgeyi dinle',
  stop:            '⏹ Durdur',
  critical_listen: '🔊 Kritik aksiyonları dinle',
  busy:            '…',
};

const FALLBACK = 'de' as const;

export function speechUi(lang: string | undefined, key: SpeechUiKey): string {
  const l = lang === 'tr' ? 'tr' : FALLBACK;
  return (l === 'tr' ? tr : de)[key];
}

export function speechA11yLabel(lang: string | undefined, key: 'full' | 'critical' | 'stop'): string {
  const l = lang === 'tr' ? 'tr' : FALLBACK;
  if (l === 'tr') {
    if (key === 'stop') return 'Sesli okumayı durdur';
    if (key === 'full') return 'Tüm metni sesli dinle';
    return 'Kritik aksiyonları sesli dinle';
  }
  if (key === 'stop') return 'Vorlesen beenden';
  if (key === 'full') return 'Gesamten Dokumenttext vorlesen';
  return 'Kritische Punkte vorlesen';
}
