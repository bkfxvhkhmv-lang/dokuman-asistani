/**
 * Finanzamt document analysis — deterministic, no LLM.
 * Extracts fields relevant for reply generation from OCR text + document fields.
 */
import type { Dokument } from '@/store';

export interface FinanzamtAnalysis {
  isFinanzamt: boolean;
  confidence: 'high' | 'medium' | 'low';

  // Extracted fields
  absender: string | null;
  steuernummer: string | null;
  aktenzeichen: string | null;
  bescheiddatum: string | null;
  frist: string | null;           // Rechtsbehelfsfrist / deadline
  betrag: number | null;
  waehrung: string;

  // What was rejected/disputed
  abgelehnterPosten: string | null;
  ablehnungsgrund: string | null;

  // Summary for UI
  zusammenfassung: string;
}

// ── Detection keywords ────────────────────────────────────────────────────────

const FINANZAMT_KEYWORDS = [
  'Finanzamt', 'Steuerbescheid', 'Einkommensteuerbescheid',
  'Körperschaftsteuerbescheid', 'Umsatzsteuerbescheid',
  'Einspruch', 'Rechtsbehelfsbelehrung', 'Rechtsbehelf',
  'Steuernummer', 'Steuer-Identifikationsnummer',
  'Werbungskosten', 'Sonderausgaben', 'außergewöhnliche Belastungen',
  'nicht anerkannt', 'nicht berücksichtigt', 'abgelehnt',
  'Nachweis', 'Belege beizubringen', 'nachzuweisen',
  'Elster', 'Finanzgericht', 'Einkommensteuer',
  'Gewerbesteuerbescheid', 'Lohnsteuerbescheinigung',
  'festgesetzt', 'Festsetzung',
];

const FINANZAMT_HIGH_CONFIDENCE = [
  'Finanzamt', 'Steuerbescheid', 'Einspruch', 'Rechtsbehelfsbelehrung',
  'Einkommensteuerbescheid', 'festgesetzt',
];

// ── Field extraction helpers ──────────────────────────────────────────────────

function _extract(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1]?.trim() ?? null;
  }
  return null;
}

function _extractSteuernummer(text: string): string | null {
  return _extract(text, [
    /Steuernummer[:\s]+([0-9\s\/]{6,20})/i,
    /St(?:\.-?Nr\.?|euer-?Nr\.?)[:\s]+([0-9\s\/]{6,20})/i,
  ]);
}

function _extractAktenzeichen(text: string): string | null {
  return _extract(text, [
    /Aktenzeichen[:\s]+([A-Z0-9\/\-\s]{4,30})/i,
    /Az[.:\s]+([A-Z0-9\/\-\s]{4,30})/i,
    /Geschäftszeichen[:\s]+([A-Z0-9\/\-\s]{4,30})/i,
  ]);
}

function _extractBescheiddatum(text: string): string | null {
  return _extract(text, [
    /Bescheid\s+vom[:\s]+(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/i,
    /Datum\s+des\s+Bescheids[:\s]+(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/i,
    /Bescheiddatum[:\s]+(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/i,
  ]);
}

function _extractFrist(text: string): string | null {
  return _extract(text, [
    /Einspruchsfrist[:\s]+(?:bis\s+)?(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/i,
    /Rechtsbehelfsfrist[:\s]+(?:bis\s+)?(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/i,
    /fristgerecht\s+bis[:\s]+(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/i,
    /binnen\s+(?:eines\s+Monats?|30\s+Tagen?)[^.]*?(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/i,
  ]);
}

function _extractAbgelehnterPosten(text: string): string | null {
  return _extract(text, [
    /Werbungskosten[^.]{0,80}(?:nicht\s+anerkannt|nicht\s+berücksichtigt|abgelehnt)/i,
    /(?:nicht\s+anerkannt|abgelehnt)[^.]{0,80}?(Werbungskosten|Sonderausgaben|außergewöhnliche\s+Belastungen|Betriebsausgaben)/i,
    /(?:Ausgaben?|Kosten?|Aufwendungen?)\s+(?:für\s+[^.]{0,60})\s+(?:nicht\s+anerkannt|nicht\s+berücksichtigt)/i,
  ]);
}

function _extractAblehnungsgrund(text: string): string | null {
  return _extract(text, [
    /Begründung[:\s]+([^.\n]{10,120})/i,
    /(?:weil|da)\s+([^.\n]{10,120}(?:Nachweis|belegt|nachgewiesen|fehlt|nicht\s+vorlag))/i,
    /Nachweis[^.]{0,80}(?:fehlt|nicht\s+erbracht|liegt\s+nicht\s+vor)/i,
  ]);
}

// ── Main analysis ─────────────────────────────────────────────────────────────

export function analyzeFinanzamt(dok: Dokument): FinanzamtAnalysis {
  const rohText = (dok as any).rohText as string | null | undefined ?? '';
  const combined = `${dok.typ ?? ''} ${dok.titel ?? ''} ${dok.absender ?? ''} ${rohText}`;

  // Detection
  const highMatches = FINANZAMT_HIGH_CONFIDENCE.filter(kw =>
    combined.toLowerCase().includes(kw.toLowerCase()),
  );
  const anyMatches = FINANZAMT_KEYWORDS.filter(kw =>
    combined.toLowerCase().includes(kw.toLowerCase()),
  );

  const isFinanzamt =
    highMatches.length >= 1 ||
    anyMatches.length >= 2 ||
    (dok.typ === 'Steuerbescheid') ||
    (dok.typ === 'Steuer');

  const confidence: FinanzamtAnalysis['confidence'] =
    highMatches.length >= 2 ? 'high'
    : highMatches.length >= 1 || anyMatches.length >= 3 ? 'medium'
    : 'low';

  // Field extraction — prefer typed fields, fall back to OCR regex
  const steuernummer =
    (dok as any).steuerid as string | null
    ?? _extractSteuernummer(rohText);

  const aktenzeichen =
    dok.aktenzeichen
    ?? _extractAktenzeichen(rohText);

  const bescheiddatum =
    (dok.dokumentDatum ? new Date(dok.dokumentDatum).toLocaleDateString('de-DE') : null)
    ?? _extractBescheiddatum(rohText);

  const frist =
    (dok.frist ? new Date(dok.frist).toLocaleDateString('de-DE') : null)
    ?? _extractFrist(rohText);

  const abgelehnterPosten = _extractAbgelehnterPosten(rohText);
  const ablehnungsgrund = _extractAblehnungsgrund(rohText);

  // Summary
  const parts: string[] = [];
  if (dok.absender) parts.push(dok.absender);
  if (bescheiddatum) parts.push(`Bescheid vom ${bescheiddatum}`);
  if (frist) parts.push(`Frist: ${frist}`);
  if (abgelehnterPosten) parts.push(`Strittig: ${abgelehnterPosten.slice(0, 60)}`);
  const zusammenfassung = parts.join(' · ') || 'Steuerbescheid — bitte Angaben prüfen';

  return {
    isFinanzamt,
    confidence,
    absender: dok.absender ?? null,
    steuernummer,
    aktenzeichen,
    bescheiddatum,
    frist,
    betrag: typeof dok.betrag === 'number' ? dok.betrag : null,
    waehrung: (dok as any).waehrung as string ?? 'EUR',
    abgelehnterPosten,
    ablehnungsgrund,
    zusammenfassung,
  };
}

// ── Deterministic draft builders ──────────────────────────────────────────────

const _HEUTE = () => new Date().toLocaleDateString('de-DE');

function _header(a: FinanzamtAnalysis): string {
  const empfaenger = a.absender ?? 'Finanzamt';
  const az = a.aktenzeichen ? `Aktenzeichen: ${a.aktenzeichen}\n` : '';
  const stNr = a.steuernummer ? `Steuernummer: ${a.steuernummer}\n` : '';
  return `[Ihr Name]\n[Ihre Adresse]\n[PLZ Ort]\n\n${empfaenger}\n[Adresse]\n\n${_HEUTE()}\n\n${az}${stNr}`;
}

export function buildFristWahrenDraft(a: FinanzamtAnalysis): {
  empfaenger: string; betreff: string; text: string;
} {
  const empfaenger = a.absender ?? 'Finanzamt';
  const bescheildbez = a.bescheiddatum
    ? `Bescheid vom ${a.bescheiddatum}`
    : 'oben genannten Bescheid';
  const az = a.aktenzeichen ?? '[Aktenzeichen]';

  const betreff = `Fristwahrung — Einspruch gegen ${bescheildbez}`;

  const text = `${_header(a)}
Betreff: ${betreff}

Sehr geehrte Damen und Herren,

hiermit lege ich vorsorglich und fristwahrend Einspruch gegen den ${bescheildbez} ein (Aktenzeichen: ${az}).

Eine ausführliche Begründung werde ich nachreichen.

Ich bitte um schriftliche Bestätigung des Eingangs dieses Einspruchs.

Mit freundlichen Grüßen
[Ihr Name]

---
Entwurf · Keine Rechtsberatung`;

  return { empfaenger, betreff, text };
}

export function buildKlaerungDraft(a: FinanzamtAnalysis): {
  empfaenger: string; betreff: string; text: string;
} {
  const empfaenger = a.absender ?? 'Finanzamt';
  const bescheildbez = a.bescheiddatum
    ? `Bescheid vom ${a.bescheiddatum}`
    : 'oben genannten Bescheid';
  const az = a.aktenzeichen ?? '[Aktenzeichen]';

  const betreff = `Klärungsanfrage zum ${bescheildbez}`;

  const streitpunkt = a.abgelehnterPosten
    ? `die Nichtanerkennung von ${a.abgelehnterPosten}`
    : 'die Abweichung von meiner Steuererklärung';

  const text = `${_header(a)}
Betreff: ${betreff}

Sehr geehrte Damen und Herren,

bezüglich des ${bescheildbez} (Aktenzeichen: ${az}) bitte ich um Klärung zu ${streitpunkt}.

Ich bitte Sie um:
1. Eine nachvollziehbare Begründung, warum dieser Punkt nicht anerkannt wurde.
2. Die genaue Berechnung bzw. Herleitung des festgesetzten Betrags.
3. Hinweis darauf, welche Unterlagen oder Nachweise ggf. noch erforderlich sind.

Bitte antworten Sie mir schriftlich bis zum [Datum eintragen].

Mit freundlichen Grüßen
[Ihr Name]

---
Entwurf · Keine Rechtsberatung`;

  return { empfaenger, betreff, text };
}

export function buildBegruendetDraft(
  a: FinanzamtAnalysis,
  answers: { hasNachweis?: boolean; istBeruflich?: boolean; zusatzinfo?: string },
): { empfaenger: string; betreff: string; text: string } {
  const empfaenger = a.absender ?? 'Finanzamt';
  const bescheildbez = a.bescheiddatum
    ? `Bescheid vom ${a.bescheiddatum}`
    : 'oben genannten Bescheid';
  const az = a.aktenzeichen ?? '[Aktenzeichen]';

  const betreff = `Einspruch gegen ${bescheildbez} — mit Begründung`;

  const nachweisZeile = answers.hasNachweis === true
    ? 'Die erforderlichen Belege lege ich diesem Schreiben bei.'
    : answers.hasNachweis === false
      ? 'Die Belege liegen mir derzeit nicht vor. Ich bitte um eine Fristverlängerung zur Nachreichung.'
      : '[Bitte hier Angaben zu Ihren Nachweisen ergänzen]';

  const beruflichZeile = answers.istBeruflich === true
    ? 'Die Ausgaben stehen in direktem Zusammenhang mit meiner beruflichen Tätigkeit.'
    : answers.istBeruflich === false
      ? '[Bitte hier die Art der Ausgaben genauer beschreiben]'
      : '';

  const zusatz = answers.zusatzinfo
    ? `\nWeitere Angaben: ${answers.zusatzinfo}`
    : '';

  const streitpunkt = a.abgelehnterPosten
    ? `die Nichtanerkennung von ${a.abgelehnterPosten}`
    : 'die im Bescheid vorgenommene Abweichung';

  const text = `${_header(a)}
Betreff: ${betreff}

Sehr geehrte Damen und Herren,

hiermit lege ich Einspruch gegen den ${bescheildbez} (Aktenzeichen: ${az}) ein.

Begründung:

Ich widerspreche ${streitpunkt}.

${nachweisZeile}
${beruflichZeile}${zusatz}

Ich bitte Sie, den Bescheid entsprechend zu korrigieren und mir das Ergebnis schriftlich mitzuteilen.

Mit freundlichen Grüßen
[Ihr Name]

---
Entwurf · Keine Rechtsberatung`;

  return { empfaenger, betreff, text };
}
