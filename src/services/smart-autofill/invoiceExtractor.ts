import type { Dokument } from '@/store';
import { extractRechnungsnr } from './extractors';

type FeldResult<T> = { wert: T | null; score: number };

const MIN_SCORE = 70;

function textVon(dok: Dokument): string {
  return dok.rohText ?? '';
}

/**
 * Parses German-locale number strings to float.
 * German format: 1.234.567,89  (dot = thousands sep, comma = decimal)
 * English format: 1,234,567.89 (comma = thousands sep, dot = decimal)
 *
 * Examples:
 *   "2.500,00"       → 2500
 *   "1.234.567,89"   → 1234567.89
 *   "2500,00"        → 2500
 *   "€ 2.500,00"     → 2500
 *   "2.500,00 EUR"   → 2500
 *   "2500.00"        → 2500
 */
export function parseGermanAmount(wert: string): number | null {
  // Strip currency symbols and whitespace
  const clean = wert.replace(/[€$£\s]/g, '').replace(/EUR/gi, '').trim();
  if (!clean) return null;

  // German format: ends with ,DD (comma as decimal separator)
  const germanFormat = /^-?[\d.]+,\d{1,2}$/.test(clean);
  if (germanFormat) {
    // Remove thousand-separator dots, convert decimal comma to dot
    const normalised = clean.replace(/\./g, '').replace(',', '.');
    const val = Number.parseFloat(normalised);
    return Number.isFinite(val) ? Math.round(val * 100) / 100 : null;
  }

  // Fallback: treat as-is (English format or plain integer)
  const val = Number.parseFloat(clean.replace(',', ''));
  return Number.isFinite(val) ? Math.round(val * 100) / 100 : null;
}

function parseBetrag(wert: string): number | null {
  return parseGermanAmount(wert);
}

function parseDatum(wert: string): string | null {
  const sauber = wert.trim();

  const deutsch = sauber.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (deutsch) {
    const tag = deutsch[1].padStart(2, '0');
    const monat = deutsch[2].padStart(2, '0');
    const jahr = deutsch[3].length === 2 ? `20${deutsch[3]}` : deutsch[3];
    return `${jahr}-${monat}-${tag}`;
  }

  const iso = sauber.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return iso ? sauber : null;
}

function extrahiereDatum(text: string, patterns: RegExp[]): FeldResult<string> {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const datum = parseDatum(match[1]);
      if (datum) return { wert: datum, score: 85 };
    }
  }
  return { wert: null, score: 0 };
}

function extrahiereBetrag(text: string, patterns: RegExp[]): FeldResult<number> {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const betrag = parseBetrag(match[1]);
      if (betrag !== null) return { wert: betrag, score: 85 };
    }
  }
  return { wert: null, score: 0 };
}

function extrahiereText(text: string, patterns: RegExp[]): FeldResult<string> {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return { wert: match[1].trim(), score: 82 };
  }
  return { wert: null, score: 0 };
}

function extrahiereMwst(text: string): FeldResult<string> {
  const patterns = [
    /(?:MwSt\.?|Mehrwertsteuer|USt\.?|Umsatzsteuer)\s*(?:Satz)?[:\s]*(7|19)\s*%/i,
    /(7|19)\s*%\s*(?:MwSt\.?|Mehrwertsteuer|USt\.?|Umsatzsteuer)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return { wert: `${match[1]}%`, score: 88 };
  }

  return { wert: null, score: 0 };
}

function fuegeEtikettHinzu(etiketten: string[], key: string, wert: string | number): void {
  etiketten.push(`${key}: ${wert}`);
}

export function extractInvoiceFields(dok: Dokument): Partial<Dokument> {
  const text = textVon(dok);
  if (!text.trim()) return {};

  const ergebnis: Partial<Dokument> = {};
  const etiketten = [...(dok.etiketten ?? [])];

  const rechnungsnummer = extractRechnungsnr(text);
  if (rechnungsnummer.wert && rechnungsnummer.score > MIN_SCORE) {
    fuegeEtikettHinzu(etiketten, 'Rechnungsnummer', rechnungsnummer.wert);
  }

  const rechnungsdatum = extrahiereDatum(text, [
    /[Rr]echnungsdatum[:\s]+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/,
    /[Rr]echnung\s+vom[:\s]+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/,
    /[Dd]atum[:\s]+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/,
  ]);
  if (rechnungsdatum.wert && rechnungsdatum.score > MIN_SCORE) {
    ergebnis.datum = rechnungsdatum.wert;
    fuegeEtikettHinzu(etiketten, 'Rechnungsdatum', rechnungsdatum.wert);
  }

  const faelligkeit = extrahiereDatum(text, [
    /[Ff]ällig(?:keit|keitsdatum)?[:\s]+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/,
    /[Zz]ahlbar\s+bis[:\s]+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/,
    /[Zz]ahlungsziel[:\s]+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/,
  ]);
  if (faelligkeit.wert && faelligkeit.score > MIN_SCORE) {
    ergebnis.frist = faelligkeit.wert;
    fuegeEtikettHinzu(etiketten, 'Fälligkeitsdatum', faelligkeit.wert);
  }

  const netto = extrahiereBetrag(text, [
    /[Nn]etto(?:betrag)?[:\s]+([\d.]+,\d{2})\s*(?:€|EUR)?/,
    /[Zz]wischensumme[:\s]+([\d.]+,\d{2})\s*(?:€|EUR)?/,
  ]);
  if (netto.wert !== null && netto.score > MIN_SCORE) {
    fuegeEtikettHinzu(etiketten, 'Nettobetrag', netto.wert);
  }

  const brutto = extrahiereBetrag(text, [
    /[Bb]rutto(?:betrag)?[:\s]+([\d.]+,\d{2})\s*(?:€|EUR)?/,
    /[Gg]esamt(?:betrag|summe)?[:\s]+([\d.]+,\d{2})\s*(?:€|EUR)?/,
    /[Rr]echnungsbetrag[:\s]+([\d.]+,\d{2})\s*(?:€|EUR)?/,
    /[Zz]u\s+zahlen[:\s]+([\d.]+,\d{2})\s*(?:€|EUR)?/,
  ]);
  if (brutto.wert !== null && brutto.score > MIN_SCORE) {
    ergebnis.betrag = brutto.wert;
    fuegeEtikettHinzu(etiketten, 'Bruttobetrag', brutto.wert);
  }

  const mwst = extrahiereMwst(text);
  if (mwst.wert && mwst.score > MIN_SCORE) {
    fuegeEtikettHinzu(etiketten, 'MwSt', mwst.wert);
  }

  const lieferdatum = extrahiereDatum(text, [
    /[Ll]ieferdatum[:\s]+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/,
    /[Ll]eistungsdatum[:\s]+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/,
  ]);
  if (lieferdatum.wert && lieferdatum.score > MIN_SCORE) {
    fuegeEtikettHinzu(etiketten, 'Lieferdatum', lieferdatum.wert);
  }

  const bestellnummer = extrahiereText(text, [
    /[Bb]estell(?:nummer|nr)\.?[:\s]+([A-Z0-9\-\/]{3,30})/,
    /[Aa]uftrags(?:nummer|nr)\.?[:\s]+([A-Z0-9\-\/]{3,30})/,
  ]);
  if (bestellnummer.wert && bestellnummer.score > MIN_SCORE) {
    fuegeEtikettHinzu(etiketten, 'Bestellnummer', bestellnummer.wert);
  }

  if (etiketten.length !== (dok.etiketten ?? []).length) {
    ergebnis.etiketten = Array.from(new Set(etiketten));
  }

  return ergebnis;
}
