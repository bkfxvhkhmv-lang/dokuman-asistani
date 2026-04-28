/**
 * Smart Auto-Fill v2 — V12 AI Layer
 *
 * Enhances OCR output with:
 * - Per-field confidence scoring
 * - Extended field extraction (aktenzeichen, kundennr, etc.)
 * - Missing required field detection
 * - NLP pattern corrections
 * - User-facing review payload
 */

import { DocumentAnalysis, extrahiereIBAN } from './visionApi';
import type { Dokument } from '../store';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FieldConfidence = 'hoch' | 'mittel' | 'niedrig' | 'fehlt';

export interface AutoFillField {
  key: keyof ExtractedFields;
  label: string;
  icon: string;
  wert: string | number | null;
  confidence: FieldConfidence;
  confidenceScore: number;       // 0–100
  quelle: string;                // 'ocr_regex' | 'pattern_engine' | 'institution_db' | 'nlp_inference' | 'user'
  editierbar: boolean;
  erforderlich: boolean;
}

export interface ExtractedFields {
  titel: string | null;
  typ: string;
  absender: string | null;
  betrag: number | null;
  frist: string | null;
  iban: string | null;
  aktenzeichen: string | null;
  kundennr: string | null;
  rechnungsnr: string | null;
  vertragsnr: string | null;
  zahlungszweck: string | null;
  steuerid: string | null;
  risiko: 'hoch' | 'mittel' | 'niedrig';
  aktionen: string[];
}

export interface AutoFillResult {
  fields: AutoFillField[];
  extracted: ExtractedFields;
  gesamtConfidence: number;       // 0–100 weighted
  fehlendePflichtfelder: string[];
  korrekturVorschlaege: KorrekturVorschlag[];
  verarbeitungsDauer: number;     // ms
}

export interface KorrekturVorschlag {
  feldKey: keyof ExtractedFields;
  grund: string;
  vorschlag: string | number | null;
}

// ── Field metadata ─────────────────────────────────────────────────────────────

const FIELD_META: Record<keyof ExtractedFields, { label: string; icon: string; erforderlich: boolean; editierbar: boolean }> = {
  titel:         { label: 'Titel',          icon: '📄', erforderlich: true,  editierbar: true  },
  typ:           { label: 'Dokumenttyp',    icon: '🏷',  erforderlich: true,  editierbar: true  },
  absender:      { label: 'Absender',       icon: '👤', erforderlich: true,  editierbar: true  },
  betrag:        { label: 'Betrag (€)',     icon: '💶', erforderlich: false, editierbar: true  },
  frist:         { label: 'Frist / Datum',  icon: '📅', erforderlich: false, editierbar: true  },
  iban:          { label: 'IBAN',           icon: '🏦', erforderlich: false, editierbar: true  },
  aktenzeichen:  { label: 'Aktenzeichen',  icon: '📎', erforderlich: false, editierbar: true  },
  kundennr:      { label: 'Kundennummer',   icon: '🔖', erforderlich: false, editierbar: true  },
  rechnungsnr:   { label: 'Rechnungsnr.',   icon: '', erforderlich: false, editierbar: true  },
  vertragsnr:    { label: 'Vertragsnr.',    icon: '📝', erforderlich: false, editierbar: true  },
  zahlungszweck: { label: 'Verwendungszweck', icon: '💬', erforderlich: false, editierbar: true },
  steuerid:      { label: 'Steuernummer',   icon: '📊', erforderlich: false, editierbar: true  },
  risiko:        { label: 'Risikostufe',    icon: '🎯', erforderlich: true,  editierbar: true  },
  aktionen:      { label: 'Aktionen',       icon: '⚡', erforderlich: false, editierbar: false },
};

// Pflichtfelder pro Typ
const PFLICHT_FELDER: Record<string, (keyof ExtractedFields)[]> = {
  Rechnung:        ['typ', 'absender', 'betrag', 'frist'],
  Mahnung:         ['typ', 'absender', 'betrag', 'frist'],
  Bußgeld:         ['typ', 'absender', 'betrag', 'frist'],
  Steuerbescheid:  ['typ', 'absender', 'betrag'],
  Kündigung:       ['typ', 'absender', 'frist'],
  Termin:          ['typ', 'absender', 'frist'],
  Versicherung:    ['typ', 'absender'],
  Vertrag:         ['typ', 'absender'],
  Behördenbescheid:['typ', 'absender'],
  Sonstiges:       ['typ', 'absender'],
};

// ── Extended field extractors ─────────────────────────────────────────────────

function extractAktenzeichen(text: string): { wert: string | null; score: number } {
  const patterns = [
    /[Aa]ktenzeichen[:\s]+([A-Z0-9/_\-]{4,25})/,
    /[Kk]ennzeichen[:\s]+([A-Z0-9/_\-]{4,25})/,
    /(?:Az\.|AZ)[:\s]+([A-Z0-9/_\-]{4,25})/,
    /[Bb]escheids?nr\.?[:\s]+([A-Z0-9/_\-]{4,25})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return { wert: m[1].trim(), score: 85 };
  }
  return { wert: null, score: 0 };
}

function extractKundennr(text: string): { wert: string | null; score: number } {
  const patterns = [
    /[Kk]undennr\.?[:\s]+([A-Z0-9\-]{4,20})/,
    /[Kk]undennummer[:\s]+([A-Z0-9\-]{4,20})/,
    /[Kk]unden-?[Nn]r\.?[:\s]+([A-Z0-9\-]{4,20})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return { wert: m[1].trim(), score: 80 };
  }
  return { wert: null, score: 0 };
}

function extractRechnungsnr(text: string): { wert: string | null; score: number } {
  const patterns = [
    /[Rr]echnungs(?:nummer|nr)\.?[:\s]+([A-Z0-9\-\/]{3,20})/,
    /[Rr]e\.-?[Nn]r\.?[:\s]+([A-Z0-9\-\/]{3,20})/,
    /[Ii]nvoice\s*[Nn]o\.?[:\s]+([A-Z0-9\-\/]{3,20})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return { wert: m[1].trim(), score: 85 };
  }
  return { wert: null, score: 0 };
}

function extractVertragsnr(text: string): { wert: string | null; score: number } {
  const m = text.match(/[Vv]ertragsnr\.?[:\s]+([A-Z0-9\-]{4,20})/);
  if (m) return { wert: m[1].trim(), score: 80 };
  return { wert: null, score: 0 };
}

function extractZahlungszweck(text: string, typ: string, rechnungsnr: string | null): { wert: string | null; score: number } {
  const patterns = [
    /[Vv]erwendungszweck[:\s]+([^\n]{5,60})/,
    /[Bb]etreff[:\s]+([^\n]{5,60})/,
    /[Bb]ezug[:\s]+([^\n]{5,60})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return { wert: m[1].trim(), score: 80 };
  }
  // Infer from rechnungsnr
  if (rechnungsnr && (typ === 'Rechnung' || typ === 'Mahnung')) {
    return { wert: `Rechnungsnr. ${rechnungsnr}`, score: 55 };
  }
  return { wert: null, score: 0 };
}

function extractSteuerid(text: string): { wert: string | null; score: number } {
  const m = text.match(/(?:Steuer-ID|Steuernummer|USt-IdNr)[.:\s]+([0-9/\s]{8,20})/i);
  if (m) return { wert: m[1].replace(/\s/g, '').trim(), score: 85 };
  return { wert: null, score: 0 };
}

function extractTitelFromText(text: string, typ: string, absender: string | null): { wert: string; score: number } {
  // Betreff line
  const betreffMatch = text.match(/[Bb]etreff[:\s]+([^\n]{10,80})/);
  if (betreffMatch) return { wert: betreffMatch[1].trim(), score: 90 };

  // Subject patterns
  const betreffs = [
    /[Ii]hr(?:e|er)?\s+(?:Rechnung|Mahnung|Bescheid)[:\s]+([^\n]{5,60})/i,
    /[Rr]echnung\s+(?:vom\s+)?[Nn]r\.?\s*([A-Z0-9\-\/]{3,20})/i,
  ];
  for (const p of betreffs) {
    const m = text.match(p);
    if (m) return { wert: m[0].trim().slice(0, 60), score: 75 };
  }

  // Fallback: typ + absender
  if (absender && absender !== 'Unbekannter Absender') {
    return { wert: `${typ} von ${absender}`, score: 50 };
  }
  return { wert: typ, score: 30 };
}

// ── Confidence scoring ─────────────────────────────────────────────────────────

function scoreToConfidence(score: number): FieldConfidence {
  if (score === 0)   return 'fehlt';
  if (score >= 80)   return 'hoch';
  if (score >= 55)   return 'mittel';
  return 'niedrig';
}

function scoreBetrag(betrag: number | null, text: string): number {
  if (betrag === null) return 0;
  // More patterns matching = higher confidence
  const matches = [
    /gesamtbetrag/i, /endbetrag/i, /zu\s+zahlen/i, /summe/i,
  ].filter(p => p.test(text)).length;
  if (matches >= 2) return 92;
  if (matches === 1) return 78;
  return 55;
}

function scoreFrist(frist: string | null, text: string): number {
  if (frist === null) return 0;
  const matches = [
    /zahlungsfrist/i, /fällig.*am/i, /bis\s+(?:zum|spätestens)/i,
  ].filter(p => p.test(text)).length;
  if (matches >= 1) return 85;
  return 60;
}

function scoreAbsender(absender: string | null, text: string): number {
  if (!absender || absender === 'Unbekannter Absender') return 20;
  // Known institution markers
  if (/gmbh|ag|kg|e\.v\.|finanzamt|vodafone|telekom|stadtwerke|eon|commerzbank|sparkasse/i.test(absender)) return 90;
  if (absender.length > 10) return 70;
  return 50;
}

function scoreTyp(typ: string, text: string): number {
  const keywords: Record<string, string[]> = {
    Rechnung:        ['rechnung', 'rechnungsnr', 'mwst', 'gesamtbetrag'],
    Mahnung:         ['mahnung', 'zahlungserinnerung', 'rückstand'],
    Bußgeld:         ['bußgeld', 'ordnungswidrigkeit', 'verwarnungsgeld'],
    Steuerbescheid:  ['steuerbescheid', 'finanzamt', 'einkommensteuer'],
    Kündigung:       ['kündigung', 'kündigt'],
    Termin:          ['termin', 'vorladung'],
    Versicherung:    ['versicherung', 'police', 'versicherungsnehmer'],
    Vertrag:         ['vertrag', 'vertragspartner', 'laufzeit'],
    Behördenbescheid:['bescheid', 'behörde', 'amt'],
    Sonstiges:       [],
  };
  const lower = text.toLowerCase();
  const hits = (keywords[typ] || []).filter(kw => lower.includes(kw)).length;
  if (hits >= 3) return 95;
  if (hits === 2) return 82;
  if (hits === 1) return 68;
  if (typ === 'Sonstiges') return 40;
  return 45;
}

// ── Korrektur-Vorschläge ───────────────────────────────────────────────────────

function buildKorrekturVorschlaege(
  fields: ExtractedFields,
  text: string,
): KorrekturVorschlag[] {
  const vorschlaege: KorrekturVorschlag[] = [];

  // Betrag plausibility check
  if (fields.betrag !== null) {
    if (fields.betrag < 0.01 || fields.betrag > 500000) {
      vorschlaege.push({
        feldKey: 'betrag',
        grund: `Betrag ${fields.betrag}€ erscheint unplausibel`,
        vorschlag: null,
      });
    }
  }

  // Missing IBAN for payment types
  if (!fields.iban && ['Rechnung', 'Mahnung'].includes(fields.typ) && /iban/i.test(text)) {
    vorschlaege.push({
      feldKey: 'iban',
      grund: 'IBAN im Text erwähnt, aber nicht korrekt erkannt',
      vorschlag: null,
    });
  }

  // Frist in the past warning
  if (fields.frist) {
    const fristDate = new Date(fields.frist);
    const diff = Math.round((fristDate.getTime() - Date.now()) / 86400000);
    if (diff < -365) {
      vorschlaege.push({
        feldKey: 'frist',
        grund: 'Erkanntes Datum liegt mehr als 1 Jahr in der Vergangenheit — OCR-Fehler?',
        vorschlag: null,
      });
    }
  }

  return vorschlaege;
}

// ── Main extraction ────────────────────────────────────────────────────────────

export function runSmartAutoFill(
  visionResult: DocumentAnalysis,
  rohText: string,
): AutoFillResult {
  const start = Date.now();

  const r = extractRechnungsnr(rohText);
  const k = extractKundennr(rohText);
  const a = extractAktenzeichen(rohText);
  const vn = extractVertragsnr(rohText);
  const zw = extractZahlungszweck(rohText, visionResult.typ, r.wert);
  const st = extractSteuerid(rohText);
  const iban = extrahiereIBAN(rohText);
  const titelResult = extractTitelFromText(rohText, visionResult.typ, visionResult.absender);

  const extracted: ExtractedFields = {
    titel:         titelResult.wert,
    typ:           visionResult.typ,
    absender:      visionResult.absender,
    betrag:        visionResult.betrag,
    frist:         visionResult.frist,
    iban:          iban,
    aktenzeichen:  a.wert,
    kundennr:      k.wert,
    rechnungsnr:   r.wert,
    vertragsnr:    vn.wert,
    zahlungszweck: zw.wert,
    steuerid:      st.wert,
    risiko:        visionResult.risiko,
    aktionen:      visionResult.aktionen,
  };

  // Confidence scores per field
  const scores: Record<keyof ExtractedFields, number> = {
    titel:         titelResult.score,
    typ:           scoreTyp(visionResult.typ, rohText),
    absender:      scoreAbsender(visionResult.absender, rohText),
    betrag:        scoreBetrag(visionResult.betrag, rohText),
    frist:         scoreFrist(visionResult.frist, rohText),
    iban:          iban ? 95 : 0,          // IBAN validated via checksum
    aktenzeichen:  a.score,
    kundennr:      k.score,
    rechnungsnr:   r.score,
    vertragsnr:    vn.score,
    zahlungszweck: zw.score,
    steuerid:      st.score,
    risiko:        85,                     // derived from typ — reliable
    aktionen:      80,
  };

  const fields: AutoFillField[] = (Object.keys(FIELD_META) as (keyof ExtractedFields)[])
    .map(key => ({
      key,
      label:           FIELD_META[key].label,
      icon:            FIELD_META[key].icon,
      wert:            extracted[key] as string | number | null,
      confidence:      scoreToConfidence(scores[key]),
      confidenceScore: scores[key],
      quelle:          scores[key] >= 80 ? 'ocr_regex' : scores[key] >= 55 ? 'pattern_engine' : 'nlp_inference',
      editierbar:      FIELD_META[key].editierbar,
      erforderlich:    FIELD_META[key].erforderlich,
    }))
    .filter(f => f.wert !== null || f.erforderlich);  // hide empty optional fields

  // Weighted overall confidence (required fields count more)
  const reqKeys = PFLICHT_FELDER[extracted.typ] || PFLICHT_FELDER.Sonstiges;
  const reqScores = reqKeys.map(k => scores[k]);
  const gesamtConfidence = reqScores.length > 0
    ? Math.round(reqScores.reduce((s, v) => s + v, 0) / reqScores.length)
    : 60;

  // Missing required fields
  const fehlendePflichtfelder = reqKeys
    .filter(k => scores[k] === 0)
    .map(k => FIELD_META[k].label);

  const korrekturVorschlaege = buildKorrekturVorschlaege(extracted, rohText);

  return {
    fields,
    extracted,
    gesamtConfidence,
    fehlendePflichtfelder,
    korrekturVorschlaege,
    verarbeitungsDauer: Date.now() - start,
  };
}

// ── Merge auto-fill result into existing Dokument fields ──────────────────────

export function mergeAutoFillIntoDokument(
  result: AutoFillResult,
  userEdits: Partial<ExtractedFields>,
): Partial<Dokument> {
  const base = { ...result.extracted, ...userEdits };
  return {
    titel:         base.titel ?? base.typ,
    typ:           base.typ,
    absender:      base.absender ?? 'Unbekannter Absender',
    betrag:        base.betrag ?? undefined,
    frist:         base.frist ?? undefined,
    risiko:        base.risiko,
    aktionen:      base.aktionen,
    // Extended fields stored via spread (v4DocId pattern)
    ...(base.iban          ? { iban: base.iban }                     : {}),
    ...(base.aktenzeichen  ? { aktenzeichen: base.aktenzeichen }     : {}),
    ...(base.kundennr      ? { kundennr: base.kundennr }             : {}),
    ...(base.rechnungsnr   ? { rechnungsnr: base.rechnungsnr }       : {}),
    ...(base.vertragsnr    ? { vertragsnr: base.vertragsnr }         : {}),
    ...(base.zahlungszweck ? { zahlungszweck: base.zahlungszweck }   : {}),
    ...(base.steuerid      ? { steuerid: base.steuerid }             : {}),
  };
}
