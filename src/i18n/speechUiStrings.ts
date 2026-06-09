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
  full_listen:     'Volltext anhören',
  stop:            'Anhalten',
  critical_listen: 'Kritische Punkte anhören',
  busy:            '…',
};

const tr: Row = {
  full_listen:     'Belgeyi dinle',
  stop:            'Durdur',
  critical_listen: 'Kritik aksiyonları dinle',
  busy:            '…',
};

const en: Row = {
  full_listen:     'Listen to document',
  stop:            'Stop',
  critical_listen: 'Listen to critical actions',
  busy:            '…',
};

const fr: Row = {
  full_listen:     'Écouter le document',
  stop:            'Arrêter',
  critical_listen: 'Écouter les actions critiques',
  busy:            '…',
};

const es: Row = {
  full_listen:     'Escuchar el documento',
  stop:            'Detener',
  critical_listen: 'Escuchar acciones críticas',
  busy:            '…',
};

const ru: Row = {
  full_listen:     'Прослушать документ',
  stop:            'Остановить',
  critical_listen: 'Прослушать важные действия',
  busy:            '…',
};

const ar: Row = {
  full_listen:     'الاستماع إلى المستند',
  stop:            'إيقاف',
  critical_listen: 'الاستماع إلى الإجراءات المهمة',
  busy:            '…',
};

const FALLBACK = 'de' as const;

export function speechUi(lang: string | undefined, key: SpeechUiKey): string {
  const l = (lang ?? FALLBACK).slice(0, 2);
  const table: Record<string, Row> = { de, tr, en, fr, es, ru, ar };
  return (table[l] ?? de)[key];
}

export function speechA11yLabel(lang: string | undefined, key: 'full' | 'critical' | 'stop'): string {
  const l = (lang ?? FALLBACK).slice(0, 2);
  if (l === 'tr') {
    if (key === 'stop') return 'Sesli okumayı durdur';
    if (key === 'full') return 'Belgenin tamamını sesli dinle';
    return 'Kritik aksiyonları sesli dinle';
  }
  if (l === 'en') {
    if (key === 'stop') return 'Stop reading aloud';
    if (key === 'full') return 'Listen to the full document text';
    return 'Listen to critical actions';
  }
  if (l === 'fr') {
    if (key === 'stop') return 'Arrêter la lecture vocale';
    if (key === 'full') return 'Écouter tout le texte du document';
    return 'Écouter les actions critiques';
  }
  if (l === 'es') {
    if (key === 'stop') return 'Detener la lectura en voz alta';
    if (key === 'full') return 'Escuchar todo el texto del documento';
    return 'Escuchar acciones críticas';
  }
  if (l === 'ru') {
    if (key === 'stop') return 'Остановить озвучивание';
    if (key === 'full') return 'Прослушать весь текст документа';
    return 'Прослушать важные действия';
  }
  if (l === 'ar') {
    if (key === 'stop') return 'إيقاف القراءة الصوتية';
    if (key === 'full') return 'الاستماع إلى النص الكامل للمستند';
    return 'الاستماع إلى الإجراءات المهمة';
  }
  if (key === 'stop') return 'Vorlesen beenden';
  if (key === 'full') return 'Gesamten Dokumenttext vorlesen';
  return 'Kritische Punkte vorlesen';
}
