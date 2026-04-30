import type { Dokument } from '@/store';

/** LLM aksiyon anahtarları → insan okumasina uygun kısa etiketler */
const AKTION_DE: Record<string, string> = {
  zahlen:           'Bezahlen',
  einspruch:        'Widerspruch',
  kalender:         'Kalendereintrag',
  antworten:        'Antwort verfassen',
  dokument:         'Dokument bereitstellen',
  unterschreiben:   'Unterschrift',
};
const AKTION_TR: Record<string, string> = {
  zahlen:           'Ödeme',
  einspruch:        'İtiraz',
  kalender:         'Takvim',
  antworten:        'Yanıt yazma',
  dokument:         'Belge yükleme',
  unterschreiben:   'İmza',
};

const RISK_DE = (v: Dokument['risiko']): string => {
  const m = {
    hoch:    'hohes Risiko',
    mittel:  'mittleres Risiko',
    niedrig: 'geringes Risiko',
  } as const;
  return v ? (m[v] ?? '') : '';
};

function riskTr(v: Dokument['risiko']): string {
  const m = { hoch: 'yüksek risk', mittel: 'orta risk', niedrig: 'düşük risk' } as const;
  return v ? (m[v] ?? '') : '';
}

function aktionEtiketi(k: string, tr: boolean): string {
  const raw = k.trim().toLowerCase();
  const d = AKTION_DE[raw] ?? k;
  const t = AKTION_TR[raw] ?? d;
  return tr ? t : d;
}

function fmtFrist(iso: string, tr: boolean): string {
  return new Date(iso).toLocaleDateString(tr ? 'tr-TR' : 'de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Öncelik / son tarih / aksiyon listesi için kısa vorlese-Metni.
 */
export function buildCriticalActionsSpeakText(d: Dokument, lang: string): string | null {
  const tr = lang === 'tr';
  const teile: string[] = [];

  const riskStr = tr ? riskTr(d.risiko) : RISK_DE(d.risiko);
  if (riskStr) teile.push(tr ? `Risk: ${riskStr}` : `Risiko: ${riskStr}`);

  if (d.frist) {
    const f = fmtFrist(d.frist, tr);
    teile.push(tr ? `Son tarih: ${f}` : `Frist: ${f}`);
  }

  const akts = [...(d.aktionen ?? [])].filter(Boolean);
  if (akts.length) {
    const labels = akts.map(a => aktionEtiketi(a, tr));
    teile.push(
      tr ? `Önerilen aksiyonlar: ${labels.join(', ')}.` : `Empfohlene Aktionen: ${labels.join(', ')}.`,
    );
  }

  if (teile.length === 0) return null;
  const body = teile.join(tr ? '. ' : '. ');
  return `${body}`;
}
