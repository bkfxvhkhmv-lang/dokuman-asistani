import type { Dokument } from '@/store';
import { documentMatchesTypChip } from '@/product/canonicalDocTypes';
import { getTageVerbleibend } from '@/utils/formatters';

export function sortByRisiko(docs: Dokument[]): Dokument[] {
  const order: Record<string, number> = { hoch: 0, mittel: 1, niedrig: 2 };
  return [...docs].sort((a, b) => {
    const oa = order[a.risiko ?? 'niedrig'] ?? 2;
    const ob = order[b.risiko ?? 'niedrig'] ?? 2;
    if (oa !== ob) return oa - ob;
    const ta = a.frist ? new Date(a.frist).getTime() : new Date(9999, 0).getTime();
    const tb = b.frist ? new Date(b.frist).getTime() : new Date(9999, 0).getTime();
    return ta - tb;
  });
}

export interface FilterParams {
  risiko?: string;
  typ?: string;
  sortBy?: string;
  nurOffen?: boolean;
  /** Home-Schnellfilter inline (übersteuert keine Einstellungen) */
  quickScope?: 'alle' | 'offen' | 'ueberfaellig';
}

export function filterDokumente(
  docs: Dokument[],
  { risiko, typ, sortBy, nurOffen, quickScope }: FilterParams,
): Dokument[] {
  let r = [...docs];
  if (quickScope === 'offen') {
    r = r.filter(d => !d.erledigt);
  } else if (quickScope === 'ueberfaellig') {
    r = r.filter(d => {
      if (!d.frist || d.erledigt) return false;
      const tage = getTageVerbleibend(d.frist);
      return tage !== null && tage < 0;
    });
  } else if (quickScope === 'alle') {
    /* — inkl. Erledigte */
  } else if (nurOffen) {
    r = r.filter(d => !d.erledigt);
  }
  if (risiko && risiko !== 'alle') r = r.filter(d => d.risiko === risiko);
  if (typ && typ !== 'alle') r = r.filter(d => documentMatchesTypChip(d.typ, typ));
  switch (sortBy) {
    case 'datum_neu':  r.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime()); break;
    case 'datum_alt':  r.sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime()); break;
    case 'betrag_hoch': r.sort((a, b) => ((b.betrag as number) || 0) - ((a.betrag as number) || 0)); break;
    case 'frist': r.sort((a, b) => {
      const ta = a.frist ? new Date(a.frist).getTime() : new Date(9999, 0).getTime();
      const tb = b.frist ? new Date(b.frist).getTime() : new Date(9999, 0).getTime();
      return ta - tb;
    }); break;
    default: r = sortByRisiko(r);
  }
  return r;
}

export function getUngelesen(docs: Dokument[]): number {
  return docs.filter(d => !d.gelesen && !d.erledigt).length;
}

export interface ParsedAbfrage {
  restQuery: string; minBetrag: string; maxBetrag: string;
  vonDatum: string; bisDatum: string; typ: string; risiko: string; ueberfaellig: boolean;
}

export function parseNatuerlicheAbfrage(query: string): ParsedAbfrage {
  let rest = query;
  let minBetrag = '', maxBetrag = '', vonDatum = '', bisDatum = '', typ = '', risiko = '', ueberfaellig = false;
  const heute = new Date();
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);
  rest = rest.replace(/(?:über|mehr als?)\s*(\d+(?:[.,]\d+)?)\s*(?:€|eur(?:o)?)?/gi, (_, n: string) => { minBetrag = n.replace(',', '.'); return ''; });
  rest = rest.replace(/(?:unter|weniger als?)\s*(\d+(?:[.,]\d+)?)\s*(?:€|eur(?:o)?)?/gi, (_, n: string) => { maxBetrag = n.replace(',', '.'); return ''; });
  rest = rest.replace(/(\d+(?:[.,]\d+)?)\s*(?:€|eur(?:o))/gi, (_, n: string) => { minBetrag = String(parseFloat(n.replace(',', '.')) * 0.9); maxBetrag = String(parseFloat(n.replace(',', '.')) * 1.1); return ''; });
  if (/überfällig|fällig|abgelaufen|verfallen/i.test(rest)) { ueberfaellig = true; rest = rest.replace(/überfällig|fällig|abgelaufen|verfallen/gi, ''); }
  if (/heute/i.test(rest)) { vonDatum = isoDate(heute); bisDatum = isoDate(heute); rest = rest.replace(/heute/gi, ''); }
  if (/diese[rn]?\s+woche/i.test(rest)) {
    const mon = new Date(heute); mon.setDate(heute.getDate() - heute.getDay() + (heute.getDay() === 0 ? -6 : 1));
    const son = new Date(mon); son.setDate(mon.getDate() + 6);
    vonDatum = isoDate(mon); bisDatum = isoDate(son);
    rest = rest.replace(/diese[rn]?\s+woche/gi, '');
  }
  if (/diese[nm]?\s+monat/i.test(rest)) { vonDatum = isoDate(new Date(heute.getFullYear(), heute.getMonth(), 1)); bisDatum = isoDate(new Date(heute.getFullYear(), heute.getMonth() + 1, 0)); rest = rest.replace(/diese[nm]?\s+monat/gi, ''); }
  if (/letzten?\s+monat/i.test(rest)) { vonDatum = isoDate(new Date(heute.getFullYear(), heute.getMonth() - 1, 1)); bisDatum = isoDate(new Date(heute.getFullYear(), heute.getMonth(), 0)); rest = rest.replace(/letzten?\s+monat/gi, ''); }
  if (/dieses?\s+jahr/i.test(rest)) { vonDatum = `${heute.getFullYear()}-01-01`; bisDatum = `${heute.getFullYear()}-12-31`; rest = rest.replace(/dieses?\s+jahr/gi, ''); }
  if (/\b(dringend|hoch|kritisch)\b/i.test(rest)) { risiko = 'hoch'; rest = rest.replace(/\b(dringend|hoch|kritisch)\b/gi, ''); }
  else if (/\b(mittel)\b/i.test(rest)) { risiko = 'mittel'; rest = rest.replace(/\b(mittel)\b/gi, ''); }
  else if (/\b(niedrig|gering)\b/i.test(rest)) { risiko = 'niedrig'; rest = rest.replace(/\b(niedrig|gering)\b/gi, ''); }
  const typMap: Record<string, string> = { rechnung: 'Rechnung', mahnung: 'Mahnung', bußgeld: 'Bußgeld', bussgeld: 'Bußgeld', behörde: 'Behörde', behorde: 'Behörde', finanzamt: 'Behörde', steuer: 'Steuerbescheid', steuerbescheid: 'Steuerbescheid', termin: 'Termin', versicherung: 'Versicherung', vertrag: 'Vertrag', sonstiges: 'Sonstiges' };
  for (const [kw, val] of Object.entries(typMap)) {
    const rx = new RegExp(`\\b${kw}\\b`, 'i');
    if (rx.test(rest)) { if (!typ) typ = val; rest = rest.replace(rx, ''); }
  }
  return { restQuery: rest.trim(), minBetrag, maxBetrag, vonDatum, bisDatum, typ, risiko, ueberfaellig };
}

// Umlaute + Türkçe karakterleri normalize eder — "über" ve "uber" aynı sonucu verir.
function normalizeSearchText(t: string): string {
  return t
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ç/g, 'c')
    .replace(/[^a-z0-9.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Runtime haystack — store'a persist edilmez, her arama anında hesaplanır.
// Max 2000 karakter; rohText ilk 1000 karakter ile sınırlandırılır.
export function buildSearchHaystack(d: Dokument): string {
  const parts: string[] = [
    d.titel,
    d.absender,
    d.typ,
    d.zusammenfassung ?? '',
    d.betrag != null ? String(d.betrag) : '',
    d.aktenzeichen ?? '',
    d.dokumentDatum ?? '',
    d.datum,
    d.frist ?? '',
    (d.etiketten ?? []).join(' '),
    (d.rohText ?? '').slice(0, 1000),
  ];
  return normalizeSearchText(parts.filter(Boolean).join(' ')).slice(0, 2000);
}

export interface SearchParams {
  query?: string; minBetrag?: string; maxBetrag?: string;
  vonDatum?: string; bisDatum?: string; typ?: string; risiko?: string; mitErledigt?: boolean;
}

export function filterBySearch(docs: Dokument[], { query = '', minBetrag = '', maxBetrag = '', vonDatum = '', bisDatum = '', typ = 'alle', risiko = 'alle', mitErledigt = false }: SearchParams): Dokument[] {
  const parsed = parseNatuerlicheAbfrage(query);
  const effectiveMin = minBetrag !== '' ? minBetrag : parsed.minBetrag;
  const effectiveMax = maxBetrag !== '' ? maxBetrag : parsed.maxBetrag;
  const effectiveVon = vonDatum || parsed.vonDatum;
  const effectiveBis = bisDatum || parsed.bisDatum;
  const effectiveTyp = (typ && typ !== 'alle') ? typ : (parsed.typ || 'alle');
  const effectiveRisiko = (risiko && risiko !== 'alle') ? risiko : (parsed.risiko || 'alle');
  // AND-Logik: alle Wörter müssen im Haystack vorkommen
  const words = normalizeSearchText(parsed.restQuery).split(' ').filter(w => w.length >= 2);
  return docs.filter(d => {
    if (!mitErledigt && d.erledigt) return false;
    if (parsed.ueberfaellig && (!d.frist || new Date(d.frist) >= new Date())) return false;
    if (words.length > 0) {
      const haystack = buildSearchHaystack(d);
      if (!words.every(w => haystack.includes(w))) return false;
    }
    const bet = (d.betrag as number) || 0;
    if (effectiveMin !== '' && !isNaN(parseFloat(effectiveMin)) && bet < parseFloat(effectiveMin)) return false;
    if (effectiveMax !== '' && !isNaN(parseFloat(effectiveMax)) && bet > parseFloat(effectiveMax)) return false;
    // Tarih filtresi: belge tarihi önce, yoksa scan tarihi
    const effectiveDate = d.dokumentDatum ?? d.datum;
    if (effectiveVon && effectiveDate && new Date(effectiveDate) < new Date(effectiveVon)) return false;
    if (effectiveBis && effectiveDate && new Date(effectiveDate) > new Date(effectiveBis + 'T23:59:59')) return false;
    if (effectiveTyp && effectiveTyp !== 'alle' && !documentMatchesTypChip(d.typ, effectiveTyp)) return false;
    if (effectiveRisiko && effectiveRisiko !== 'alle' && d.risiko !== effectiveRisiko) return false;
    return true;
  });
}
