/**
 * IntentDetector — Belgenin "amacını" tespit eder.
 * Sınıflandırma değil; belge senden ne istiyor?
 */

export type DocumentIntent =
  | 'information'     // Sadece bilgilendirme
  | 'warning'         // Uyarı / tehdit
  | 'payment'         // Ödeme talep ediyor
  | 'action_required' // Bir şey yapmanı istiyor (genel)
  | 'decision'        // Resmi karar (Bescheid)
  | 'appeal_right'    // Itiraz hakkı doğuruyor
  | 'appointment'     // Randevu / toplantı
  | 'contract'        // İmza / sözleşme
  | 'document_upload' // Belge yüklemesi istiyor
  | 'confirmation';   // Onay / teyit

export interface IntentResult {
  primary:     DocumentIntent;
  secondary:   DocumentIntent[];
  label:       string;
  description: string;
  emoji:       string;
  color:       string;
  confidence:  number; // 0–1
}

// ── Kural tablosu ─────────────────────────────────────────────────────────────

const INTENT_RULES: Array<{
  intent:   DocumentIntent;
  patterns: RegExp[];
  weight:   number;
}> = [
  {
    intent:   'payment',
    patterns: [
      /zahlung|überweisen|bezahlen|forderung|betrag\s*(fällig|offen)|zahlungspflichtig/i,
      /bitte\s+zahlen|bitte\s+überweisen|zahlungsaufforderung|rechnungsbetrag/i,
      /sepa-lastschrift|iban.*bitte|lastschrift\s+einzug/i,
    ],
    weight: 10,
  },
  {
    intent:   'warning',
    patterns: [
      /mahnung|letzte\s+(mahnung|frist)|inkasso|pfändung|vollstreckung/i,
      /bei\s+nichtzahlung|nach\s+ablauf\s+der\s+frist|sicherungsübereignung/i,
      /konsequenzen|rechtliche\s+schritte|mahnverfahren/i,
    ],
    weight: 9,
  },
  {
    intent:   'appeal_right',
    patterns: [
      /widerspruch|einspruch|rechtsbehelfsbelehrung|widerspruchsfrist/i,
      /sie\s+können\s+(innerhalb|gegen|widerspruch|einspruch)/i,
      /rechtsmittel|klage|verwaltungsgericht/i,
    ],
    weight: 8,
  },
  {
    intent:   'decision',
    patterns: [
      /bescheid|entscheidung|beschluss|verfügung|festsetzung/i,
      /hiermit\s+(wird|ergeht|teilen\s+wir\s+mit)|aufgrund\s+der\s+(prüfung|bearbeitung)/i,
    ],
    weight: 7,
  },
  {
    intent:   'document_upload',
    patterns: [
      /bitte\s+(reichen\s+sie|senden\s+sie|legen\s+sie\s+vor|fügen\s+sie\s+bei)/i,
      /unterlagen|nachweise|belege|dokument(e)?\s+(einreichen|vorlegen|übersenden)/i,
      /beizufügen|anlage\s+erforderlich/i,
    ],
    weight: 7,
  },
  {
    intent:   'appointment',
    patterns: [
      /termin|vorladung|persönlich\s+erscheinen|um\s+\d+:\d+\s+uhr/i,
      /bitte\s+kommen\s+sie|einladung|besprechung/i,
    ],
    weight: 6,
  },
  {
    intent:   'contract',
    patterns: [
      /unterschrift|unterzeichnen|vertragsabschluss|kündigung(sfrist)?/i,
      /einverständniserklärung|zustimmung|vollmacht/i,
    ],
    weight: 6,
  },
  {
    intent:   'confirmation',
    patterns: [
      /bestätigung|bestätigen|quittung|empfangsbestätigung/i,
      /wir\s+bestätigen|hiermit\s+bestätigen/i,
    ],
    weight: 4,
  },
  {
    intent:   'action_required',
    patterns: [
      /bitte\s+(beachten|handeln|reagieren|antworten)/i,
      /bis\s+zum\s+\d|frist:|deadline|zeitnah|dringend/i,
    ],
    weight: 3,
  },
  {
    intent:   'information',
    patterns: [
      /wir\s+(informieren|teilen\s+ihnen\s+mit|möchten\s+sie\s+darüber)/i,
      /mitteilung|information|hinweis|zur\s+kenntnis/i,
    ],
    weight: 1,
  },
];

// ── Etiket tablosu ────────────────────────────────────────────────────────────

const INTENT_META: Record<DocumentIntent, { label: string; description: string; emoji: string; color: string }> = {
  payment:         { label: 'Zahlungsaufforderung', description: 'Dieses Dokument fordert eine Zahlung von Ihnen.',          emoji: '💶', color: '#E53935' },
  warning:         { label: 'Mahnung / Drohung',    description: 'Bei Untätigkeit drohen rechtliche Konsequenzen.',          emoji: '⚠️', color: '#F57C00' },
  appeal_right:    { label: 'Widerspruchsrecht',    description: 'Sie haben ein offizielles Widerspruchsrecht.',             emoji: '✍️', color: '#7B1FA2' },
  decision:        { label: 'Offizieller Bescheid', description: 'Dies ist ein offizieller Verwaltungsbescheid.',            emoji: '⚖️', color: '#1565C0' },
  document_upload: { label: 'Unterlagen anfordern', description: 'Sie müssen zusätzliche Dokumente einreichen.',             emoji: '📎', color: '#00838F' },
  appointment:     { label: 'Termin / Einladung',   description: 'Sie sind zu einem bestimmten Termin eingeladen.',          emoji: '📅', color: '#2E7D32' },
  contract:        { label: 'Vertrag / Unterschrift',description: 'Ihre Unterschrift oder Zustimmung wird erwartet.',        emoji: '📝', color: '#4527A0' },
  confirmation:    { label: 'Bestätigung / Quittung',description: 'Dies ist eine Bestätigung oder ein Empfangsbeleg.',       emoji: '✅', color: '#2E7D32' },
  action_required: { label: 'Handlungsbedarf',      description: 'Sie müssen aktiv werden.',                                 emoji: '⚡', color: '#EF6C00' },
  information:     { label: 'Informationsschreiben', description: 'Rein informativ — kein dringender Handlungsbedarf.',      emoji: 'ℹ️', color: '#546E7A' },
};

// ── Ana fonksiyon ─────────────────────────────────────────────────────────────

export function detectIntent(dok: Record<string, any>): IntentResult {
  const haystack = [dok.rohText, dok.zusammenfassung, dok.titel, dok.absender, dok.warnung]
    .filter(Boolean).join('\n').toLowerCase();

  const scores = new Map<DocumentIntent, number>();

  for (const rule of INTENT_RULES) {
    const hits = rule.patterns.filter(p => p.test(haystack)).length;
    if (hits > 0) {
      scores.set(rule.intent, (scores.get(rule.intent) ?? 0) + rule.weight * hits);
    }
  }

  // Belge tipinden ek sinyal
  if (dok.typ === 'Mahnung')   scores.set('warning', (scores.get('warning') ?? 0) + 15);
  if (dok.typ === 'Rechnung')  scores.set('payment', (scores.get('payment') ?? 0) + 10);
  if (dok.typ === 'Bußgeld')   scores.set('payment', (scores.get('payment') ?? 0) + 8);
  if (dok.betrag && dok.betrag > 0) scores.set('payment', (scores.get('payment') ?? 0) + 5);
  if (dok.aktionen?.includes('einspruch')) scores.set('appeal_right', (scores.get('appeal_right') ?? 0) + 8);
  if (dok.aktionen?.includes('kalender'))  scores.set('appointment', (scores.get('appointment') ?? 0) + 5);

  if (scores.size === 0) {
    const meta = INTENT_META.information;
    return { primary: 'information', secondary: [], ...meta, confidence: 0.3 };
  }

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [primaryIntent, topScore] = sorted[0];
  const secondary = sorted.slice(1, 3).map(([k]) => k);
  const totalScore = [...scores.values()].reduce((a, b) => a + b, 0);
  const confidence = Math.min(0.95, topScore / Math.max(totalScore, 1));

  const meta = INTENT_META[primaryIntent];
  return { primary: primaryIntent, secondary, ...meta, confidence };
}
