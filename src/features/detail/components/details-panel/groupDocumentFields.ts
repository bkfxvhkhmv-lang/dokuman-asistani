import type { Dokument } from '@/store';
import type { ErweiterteFeld } from '@/utils/types';
import { formatDatum } from '@/utils/formatters';

export interface DocFieldRow {
  key: string;
  icon: string;
  label: string;
  value: string;
  aiSparkle?: boolean;
}

export interface GroupedDocFields {
  wichtigste: DocFieldRow[];
  zahlung: DocFieldRow[];
  kontakt: DocFieldRow[];
  vertrag: DocFieldRow[];
  weitere: DocFieldRow[];
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/[\s.\-_/()]/g, '');
}

const ZAHLUNG_NORMS = new Set([
  'empfanger', 'iban', 'bic', 'bankname', 'kreditinstitut',
  'verwendungszweck', 'zahlungszweck', 'zahlungsempfanger', 'kontoinhaber',
]);

const KONTAKT_NORMS = new Set([
  'telefon', 'tel', 'fax', 'email', 'emai', 'adresse', 'anschrift',
  'ansprechpartner', 'kontakt', 'strasse', 'ort', 'plz', 'website', 'homepage',
]);

const HIDDEN_NORMS = new Set([
  'tabellen', 'zeilen', 'rawtext', 'confidence', 'jobid', 'provider', 'zimmer', 'raum',
]);

const VERTRAG_NORMS = new Set([
  'laufzeitende', 'laufzeit', 'vertragslaufzeit', 'vertragsende',
  'kuendigungsfrist', 'kundigungsfrist', 'kundigung', 'kundigung',
  'kuendigungsdatum', 'kundigungsdatum',
]);

function classify(label: string): 'zahlung' | 'kontakt' | 'hidden' | 'vertrag' | 'weitere' {
  const n = norm(label);
  if (HIDDEN_NORMS.has(n)) return 'hidden';
  if (ZAHLUNG_NORMS.has(n)) return 'zahlung';
  if (KONTAKT_NORMS.has(n)) return 'kontakt';
  if (VERTRAG_NORMS.has(n)) return 'vertrag';
  return 'weitere';
}

function iconForLabel(label: string): string {
  const n = norm(label);
  if (n === 'iban')              return 'bank';
  if (n === 'bic')               return 'bank';
  if (n === 'bankname' || n === 'kreditinstitut') return 'bank';
  if (n === 'empfanger' || n === 'zahlungsempfanger' || n === 'kontoinhaber') return 'user-circle';
  if (n === 'verwendungszweck' || n === 'zahlungszweck') return 'chat-circle';
  if (n === 'telefon' || n === 'tel') return 'phone';
  if (n === 'fax')               return 'printer';
  if (n === 'email' || n === 'emai') return 'envelope-simple';
  if (n === 'adresse' || n === 'anschrift' || n === 'strasse') return 'map-pin';
  if (n === 'ort' || n === 'plz') return 'map-pin';
  if (n === 'ansprechpartner' || n === 'kontakt') return 'user';
  if (n === 'website' || n === 'homepage') return 'globe';
  if (n.includes('laufzeit') || n.includes('vertragsende')) return 'calendar-check';
  if (n.includes('kundigung') || n.includes('kuendigung')) return 'bell-ringing';
  return 'list-bullets';
}

function parseRohTextPairs(rohText: string | null): Array<{ label: string; value: string }> {
  if (!rohText) return [];
  const result: Array<{ label: string; value: string }> = [];
  for (const line of rohText.split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0 && idx < 45) {
      const label = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (label && value && !/^\d/.test(label)) {
        result.push({ label, value });
      }
    }
  }
  return result;
}

export function groupDocumentFields(
  dok: Dokument,
  extrahierteFelder: ErweiterteFeld[],
): GroupedDocFields {
  const seen = new Set<string>();
  const wichtigste: DocFieldRow[] = [];
  const zahlung: DocFieldRow[] = [];
  const kontakt: DocFieldRow[] = [];
  const vertrag: DocFieldRow[] = [];
  const weitere: DocFieldRow[] = [];

  function push(group: DocFieldRow[], row: DocFieldRow) {
    const n = norm(row.label);
    if (seen.has(n)) return;
    seen.add(n);
    group.push(row);
  }

  // ── Typed dok fields (authoritative) ───────────────────────────
  if (dok.aktenzeichen) push(wichtigste, { key: 'aktenzeichen', icon: 'clipboard-text', label: 'Aktenzeichen',   value: dok.aktenzeichen,                         aiSparkle: true });
  if (dok.rechnungsnr)  push(wichtigste, { key: 'rechnungsnr',  icon: 'receipt',        label: 'Rechnungs-Nr.',  value: dok.rechnungsnr,                          aiSparkle: true });
  if (dok.iban)         push(zahlung,   { key: 'iban',          icon: 'bank',           label: 'IBAN',           value: dok.iban,                                 aiSparkle: true });
  if (dok.zahlungszweck)push(zahlung,   { key: 'zweck',         icon: 'chat-circle',    label: 'Verwendungszweck',value: dok.zahlungszweck,                        aiSparkle: true });
  if (dok.kundennr)     push(weitere,   { key: 'kundennr',      icon: 'user',           label: 'Kunden-Nr.',     value: dok.kundennr,                             aiSparkle: true });
  if (dok.vertragsnr)   push(weitere,   { key: 'vertragsnr',    icon: 'document-text',  label: 'Vertrags-Nr.',   value: dok.vertragsnr,                           aiSparkle: true });
  if (dok.steuerid)     push(weitere,   { key: 'steuerid',      icon: 'hash',           label: 'Steuer-ID',      value: dok.steuerid,                             aiSparkle: true });
  if (dok.garantieBis)       push(weitere,  { key: 'garantie',   icon: 'shield-check',    label: 'Garantie bis',       value: formatDatum(dok.garantieBis) ?? dok.garantieBis,            aiSparkle: true });
  if (dok.laufzeitende)      push(vertrag,  { key: 'laufzeit',   icon: 'calendar-check',  label: 'Laufzeitende',       value: formatDatum(dok.laufzeitende) ?? dok.laufzeitende,          aiSparkle: true });
  if (dok.kuendigungsfrist)  push(vertrag,  { key: 'kuendigung', icon: 'bell-ringing',    label: 'Kündigungsfrist',    value: formatDatum(dok.kuendigungsfrist) ?? dok.kuendigungsfrist,  aiSparkle: true });

  // ── extrahierteFelder from rohText regex ────────────────────────
  for (const f of extrahierteFelder) {
    const cat = classify(f.label);
    if (cat === 'hidden') continue;
    const row: DocFieldRow = { key: f.key, icon: f.icon || iconForLabel(f.label), label: f.label, value: f.wert, aiSparkle: true };
    if (cat === 'zahlung') push(zahlung, row);
    else if (cat === 'kontakt') push(kontakt, row);
    else if (cat === 'vertrag') push(vertrag, row);
    else push(weitere, row);
  }

  // ── rohText lines: payment + contact fields not yet covered ────
  for (const { label, value } of parseRohTextPairs(dok.rohText)) {
    const cat = classify(label);
    if (cat === 'hidden' || cat === 'weitere') continue;
    if (seen.has(norm(label))) continue;
    const row: DocFieldRow = { key: norm(label), icon: iconForLabel(label), label, value };
    if (cat === 'zahlung') push(zahlung, row);
    else push(kontakt, row);
  }

  return { wichtigste, zahlung, kontakt, vertrag, weitere };
}
