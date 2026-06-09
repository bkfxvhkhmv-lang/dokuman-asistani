import type { Dokument } from '@/store';
import { normalizeDocumentTyp } from '@/product/canonicalDocTypes';

export interface SteuerpaketOptions {
  /** Kalenderjahr (Nachweisdatum = dok.datum) */
  jahr: number;
  /** Zusätzlich Belege ohne eindeutigen Steuer-Typ aber mit Schlüsselwörtern */
  includeFinanceKeywords?: boolean;
}

/** Steuerrelevante Kategorien inkl. Bescheid-Alttypen */
function isSteuerRelevant(doc: Dokument): boolean {
  const t = doc.typ ?? '';
  const n = normalizeDocumentTyp(t);
  if (['Steuer', 'Steuerbescheid'].includes(t) || n === 'Steuer') return true;

  const x = `${doc.rohText ?? ''} ${doc.absender ?? ''} ${doc.titel ?? ''}`.toLowerCase();
  const steuerCue =
    /\b(finanzamt|festsetzung|elster|einkommensteuer|vorsteuer|umsatzsteuer|kapitalertrag|steuerbescheid|rückzahlung\s+steuer|steuernummer)\b/i;
  return steuerCue.test(x);
}

/**
 * Dokumentliste für „Steuerpaket {jahr}`“ (Design / UX).
 *
 * Produkt nächste Schritte:
 * - zusammengefügtes PDF + optional Manifest (CSV METADATA)
 * - Nutzerwahl: Vorjahres-Anlage vs. Aktuelles Quartal
 */
export function collectSteuerpaketDokumente(
  docs: Dokument[],
  opt: SteuerpaketOptions,
): Dokument[] {
  const y = opt.jahr;
  const inYear = docs.filter(d => {
    if (!isSteuerRelevant(d)) return false;
    try {
      return new Date(d.datum).getFullYear() === y;
    } catch {
      return false;
    }
  });
  return [...inYear].sort(
    (a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime(),
  );
}
