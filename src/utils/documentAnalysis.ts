import { formatBetrag, formatFrist, formatDatum, getTageVerbleibend } from './formatters';
import type { Dokument } from '../store';

export function findeAehnlicheDokumente(dok: Dokument, alleDocs: Dokument[], maxAnzahl = 5): (Dokument & { _aehnlichScore: number })[] {
  return alleDocs.filter(d => d.id !== dok.id).map(d => {
    let score = 0;
    if (d.typ === dok.typ) score += 3;
    if (dok.absender && d.absender) { const a = dok.absender.toLowerCase().split(' ')[0]; if (d.absender.toLowerCase().includes(a)) score += 2; }
    const meineEtiketten = dok.etiketten || [];
    score += meineEtiketten.filter(e => (d.etiketten || []).includes(e)).length;
    if (d.risiko === dok.risiko) score += 1;
    return { ...d, _aehnlichScore: score };
  }).filter(d => d._aehnlichScore > 0).sort((a, b) => b._aehnlichScore - a._aehnlichScore).slice(0, maxAnzahl);
}

export interface TextDiffItem { wort: string; status: 'gleich' | 'entfernt' | 'hinzugefuegt' }

export function berechneTextDiff(altText: string | null | undefined, neuText: string | null | undefined): TextDiffItem[] {
  if (!altText && !neuText) return [];
  if (!altText) return (neuText || '').split(/\s+/).filter(Boolean).map(w => ({ wort: w, status: 'hinzugefuegt' as const }));
  if (!neuText) return (altText || '').split(/\s+/).filter(Boolean).map(w => ({ wort: w, status: 'entfernt' as const }));
  const A = altText.split(/\s+/).filter(Boolean).slice(0, 200);
  const B = neuText.split(/\s+/).filter(Boolean).slice(0, 200);
  const m = A.length, n = B.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = A[i-1] === B[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  const result: TextDiffItem[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && A[i-1] === B[j-1]) { result.unshift({ wort: A[i-1], status: 'gleich' }); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { result.unshift({ wort: B[j-1], status: 'hinzugefuegt' }); j--; }
    else { result.unshift({ wort: A[i-1], status: 'entfernt' }); i--; }
  }
  return result;
}

export function berechneTextAehnlichkeit(text1: string | null | undefined, text2: string | null | undefined): number {
  if (!text1 || !text2) return 0;
  const w1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const w2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const gemeinschaft = [...w1].filter(w => w2.has(w)).length;
  const union = new Set([...w1, ...w2]).size;
  return union === 0 ? 0 : Math.round((gemeinschaft / union) * 100);
}

export interface Rozet { id: string; icon: string; label: string; beschreibung: string; verdient: boolean }

interface DokStats {
  gesamt: number; erledigt: number; dringend: number;
  offenBetrag: number; ungelesen: number;
}

const ROZETLER_DEF = [
  { id: 'erste_dokument',  icon: '📄', label: 'Erster Schritt',    beschreibung: 'Erstes Dokument hinzugefügt',        check: (s: DokStats) => s.gesamt >= 1 },
  { id: 'fuenf_dokumente', icon: '📚', label: 'Auf dem Weg',       beschreibung: '5 Dokumente verwaltet',              check: (s: DokStats) => s.gesamt >= 5 },
  { id: 'zehn_dokumente',  icon: '🗂',  label: 'Dokumenten-Profi', beschreibung: '10 Dokumente verwaltet',             check: (s: DokStats) => s.gesamt >= 10 },
  { id: 'dreissig_docs',   icon: '🏆', label: 'Meister-Archivar', beschreibung: '30 Dokumente verwaltet',             check: (s: DokStats) => s.gesamt >= 30 },
  { id: 'erste_erledigt',  icon: '✅', label: 'Erledigt!',          beschreibung: 'Erste Aufgabe abgeschlossen',       check: (s: DokStats) => s.erledigt >= 1 },
  { id: 'zehn_erledigt',   icon: '🎯', label: 'Aufgaben-Held',     beschreibung: '10 Dokumente erledigt',             check: (s: DokStats) => s.erledigt >= 10 },
  { id: 'kein_dringend',   icon: '🟢', label: 'Null Stress',       beschreibung: 'Keine dringenden Dokumente offen',  check: (s: DokStats) => s.gesamt > 0 && s.dringend === 0 },
  { id: 'erste_zahlung',   icon: '💶', label: 'Zahlung verbucht',  beschreibung: 'Erste Zahlung als erledigt markiert', check: (s: DokStats) => s.erledigt >= 1 && s.offenBetrag === 0 },
  { id: 'alle_gelesen',    icon: '👁', label: 'Alles im Blick',    beschreibung: 'Alle Dokumente gelesen',            check: (s: DokStats) => s.gesamt > 0 && s.ungelesen === 0 },
  { id: 'sammler',         icon: '⭐', label: 'Super-Sammler',     beschreibung: '50 Dokumente verwaltet',            check: (s: DokStats) => s.gesamt >= 50 },
];

export function berechneRozetler(docs: Dokument[]): Rozet[] {
  const stats = { gesamt: docs.length, erledigt: docs.filter(d => d.erledigt).length, dringend: docs.filter(d => d.risiko === 'hoch' && !d.erledigt).length, offenBetrag: docs.filter(d => d.betrag && !d.erledigt).reduce((s, d) => s + (d.betrag ?? 0), 0), ungelesen: docs.filter(d => !d.gelesen && !d.erledigt).length };
  return ROZETLER_DEF.map(r => ({ id: r.id, icon: r.icon, label: r.label, beschreibung: r.beschreibung, verdient: r.check(stats) }));
}

export interface GraphNode { id: string; titel: string; typ: string; risiko: string | undefined; zentrum?: boolean; score?: number }
export interface GraphEdge { von: string; nach: string; gewicht: 'stark' | 'mittel' | 'schwach'; grund: string }

export function baueBeziehungsGraph(dok: Dokument, alleDocs: Dokument[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const aehnliche = findeAehnlicheDokumente(dok, alleDocs, 8);
  const nodes: GraphNode[] = [{ id: dok.id, titel: dok.titel, typ: dok.typ, risiko: dok.risiko, zentrum: true }, ...aehnliche.map(d => ({ id: d.id, titel: d.titel, typ: d.typ, risiko: d.risiko, score: d._aehnlichScore }))];
  const edges: GraphEdge[] = aehnliche.map(d => {
    const gewicht: 'stark' | 'mittel' | 'schwach' = d._aehnlichScore >= 4 ? 'stark' : d._aehnlichScore >= 2 ? 'mittel' : 'schwach';
    let grund = '';
    if (d.typ === dok.typ) grund += 'Gleicher Typ · ';
    if (d.absender && dok.absender && d.absender.split(' ')[0] === dok.absender.split(' ')[0]) grund += 'Gleicher Absender · ';
    const etShared = (d.etiketten || []).filter(e => (dok.etiketten || []).includes(e));
    if (etShared.length) grund += `Etiketten: ${etShared.join(', ')} · `;
    return { von: dok.id, nach: d.id, gewicht, grund: grund.replace(/ · $/, '') };
  });
  return { nodes, edges };
}

export function erstelleWochenzusammenfassung(docs: Dokument[]): string {
  const heute = new Date();
  const inSiebenTagen = new Date(heute.getTime() + 7 * 86400000);
  const offene = docs.filter(d => !d.erledigt);
  const faellig = offene.filter(d => d.frist && new Date(d.frist) <= inSiebenTagen && new Date(d.frist) >= heute);
  const ueberfaellig = offene.filter(d => d.frist && new Date(d.frist) < heute);
  const offen = offene.filter(d => !d.frist);
  let text = `📋 BriefPilot — Wochenzusammenfassung\n${heute.toLocaleDateString('de-DE')}\n\n`;
  if (ueberfaellig.length > 0) { text += `⛔ ÜBERFÄLLIG (${ueberfaellig.length}):\n`; ueberfaellig.forEach(d => { text += `  • ${d.titel}${d.betrag ? ` — ${(d.betrag as number).toFixed(2)} €` : ''}\n`; }); text += '\n'; }
  if (faellig.length > 0) { text += ` FÄLLIG DIESE WOCHE (${faellig.length}):\n`; faellig.forEach(d => { const restTage = Math.ceil((new Date(d.frist!).getTime() - heute.getTime()) / 86400000); text += `  • ${d.titel} — in ${restTage} Tag${restTage !== 1 ? 'en' : ''}\n`; }); text += '\n'; }
  if (offen.length > 0) text += `📂 WEITERE OFFENE DOKUMENTE: ${offen.length}\n\n`;
  const gesamtBetrag = offene.filter(d => d.betrag).reduce((s, d) => s + ((d.betrag as number) || 0), 0);
  if (gesamtBetrag > 0) text += ` Offene Gesamtsumme: ${gesamtBetrag.toFixed(2)} €\n\n`;
  return text + '---\nBriefPilot App';
}

export interface Stats { gesamt: number; erledigt: number; offen: number; dringend: number; offenBetrag: number; topTypen: { typ: string; n: number }[] }

export function berechneStats(docs: Dokument[]): Stats {
  const gesamt = docs.length, erledigt = docs.filter(d => d.erledigt).length, dringend = docs.filter(d => d.risiko === 'hoch' && !d.erledigt).length;
  const offenBetrag = docs.filter(d => d.betrag && !d.erledigt).reduce((s, d) => s + ((d.betrag as number) || 0), 0);
  const typMap: Record<string, number> = {};
  docs.forEach(d => { typMap[d.typ] = (typMap[d.typ] || 0) + 1; });
  return { gesamt, erledigt, offen: gesamt - erledigt, dringend, offenBetrag, topTypen: Object.entries(typMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([typ, n]) => ({ typ, n })) };
}

export function berechneGesundheitsscore(dok: Dokument): number {
  let puan = 0;
  if (dok.confidence != null) puan += Math.round((dok.confidence / 100) * 35); else puan += 18;
  if (dok.titel && dok.titel.length > 3) puan += 10;
  if (dok.absender && dok.absender !== 'Unbekannter Absender') puan += 10;
  if (dok.frist) puan += 10;
  if (dok.betrag && dok.betrag > 0) puan += 10;
  if (dok.typ && dok.typ !== 'Sonstiges') puan += 15;
  if (['Rechnung', 'Mahnung'].includes(dok.typ) && dok.iban) puan += 10;
  return Math.min(100, puan);
}

export interface OzetKarte { icon: string; titel: string; inhalt: string; aktion: string | null; aktionLabel: string | null }

export function extrahiereOzetKartlari(dok: Dokument): OzetKarte[] {
  const betragStr = dok.betrag ? formatBetrag(dok.betrag) : null;
  const fristStr = dok.frist ? new Date(dok.frist).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : null;
  return [
    { icon: dok.risiko === 'hoch' ? '🔴' : dok.risiko === 'mittel' ? '🟡' : '🟢', titel: dok.typ, inhalt: ({ hoch: 'Sofortige Aktion erforderlich', mittel: 'Diese Woche handeln', niedrig: 'Kein dringender Bedarf' } as Record<string, string>)[dok.risiko ?? 'niedrig'] || '', aktion: null, aktionLabel: null },
    { icon: betragStr ? '💶' : '📅', titel: betragStr || (fristStr ? `Frist ${fristStr}` : 'Kein Betrag'), inhalt: fristStr ? `Fällig am ${fristStr}` : 'Kein Fälligkeitsdatum', aktion: dok.aktionen?.includes('zahlen') ? 'zahlen' : null, aktionLabel: dok.aktionen?.includes('zahlen') ? 'Jetzt zahlen' : null },
    dok.aktionen?.includes('einspruch') ? { icon: '✍️', titel: 'Einspruch möglich', inhalt: 'Vorlage in Sekunden erstellen', aktion: 'einspruch', aktionLabel: 'Vorlage öffnen' } : dok.aktionen?.includes('kalender') && dok.frist ? { icon: '📅', titel: 'Termin sichern', inhalt: 'Frist mit Erinnerung eintragen', aktion: 'kalender', aktionLabel: 'Eintragen' } : { icon: '📌', titel: 'Archivieren', inhalt: 'Als erledigt markieren', aktion: 'erledigt', aktionLabel: 'Erledigt' },
  ];
}

export function anonymisiereText(dok: Dokument): Partial<Dokument> & { _betragAnonymisiert?: string | null } {
  const maskStr = (s: string | null | undefined) => !s ? s : s[0] + '*'.repeat(Math.min(s.length - 1, 5)) + (s.length > 3 ? s.slice(-1) : '');
  return { ...dok, absender: maskStr(dok.absender) ?? dok.absender, betrag: undefined, _betragAnonymisiert: dok.betrag ? (formatBetrag(dok.betrag) ?? '').replace(/\d/g, '*') : null, zusammenfassung: (dok.zusammenfassung || '').replace(/\d{1,6}(?:[.,]\d{2})?\s*€/g, '***,** €').replace(/[A-Z]{2}\d{2}[\s\dA-Z]{12,30}/g, 'DE** **** ****') };
}

export interface JahresOzet {
  yil: number; gesamtAnzahl: number; gesamtBetrag: number; bezahlteBetraege: number;
  offeneBetraege: number; bezahlQuote: number; durchschnittBetrag: number;
  monatsGruppen: { monat: number; name: string; anzahl: number; gesamtBetrag: number; bezahlt: number; offen: number; risikoHoch: number }[];
  typVerteilung: Record<string, number>; risikoVerteilung: { hoch: number; mittel: number; niedrig: number };
  topAbsender: { ad: string; anzahl: number }[];
  geschaefstersMonat: { monat: number; name: string; anzahl: number; gesamtBetrag: number; bezahlt: number; offen: number; risikoHoch: number };
}

export function berechneJahresOzet(docs: Dokument[], yil: number): JahresOzet {
  const yilDocs = docs.filter(d => d.datum && new Date(d.datum).getFullYear() === yil);
  const monatsGruppen = Array.from({ length: 12 }, (_, i) => ({ monat: i + 1, name: new Date(yil, i, 1).toLocaleString('de-DE', { month: 'long' }), anzahl: 0, gesamtBetrag: 0, bezahlt: 0, offen: 0, risikoHoch: 0 }));
  let gesamtBetrag = 0, bezahlteBetraege = 0, offeneBetraege = 0;
  const typZaehler: Record<string, number> = {}, absenderZaehler: Record<string, number> = {}, risikoVerteilung = { hoch: 0, mittel: 0, niedrig: 0 };
  yilDocs.forEach(d => {
    const monat = new Date(d.datum).getMonth(), betrag = d.betrag ?? 0;
    monatsGruppen[monat].anzahl += 1; monatsGruppen[monat].gesamtBetrag += betrag; gesamtBetrag += betrag;
    if (d.erledigt) { monatsGruppen[monat].bezahlt += betrag; bezahlteBetraege += betrag; } else if (betrag > 0) { monatsGruppen[monat].offen += betrag; offeneBetraege += betrag; }
    if (d.risiko === 'hoch') { monatsGruppen[monat].risikoHoch += 1; risikoVerteilung.hoch += 1; } else if (d.risiko === 'mittel') risikoVerteilung.mittel += 1; else risikoVerteilung.niedrig += 1;
    typZaehler[d.typ || 'Sonstiges'] = (typZaehler[d.typ || 'Sonstiges'] || 0) + 1;
    if (d.absender) absenderZaehler[d.absender] = (absenderZaehler[d.absender] || 0) + 1;
  });
  const topAbsender = Object.entries(absenderZaehler).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([ad, anzahl]) => ({ ad, anzahl }));
  const geschaefstersMonat = monatsGruppen.reduce((max, m) => m.anzahl > max.anzahl ? m : max, monatsGruppen[0]);
  const bezahltMitBetrag = yilDocs.filter(d => (d.betrag ?? 0) > 0).length;
  return { yil, gesamtAnzahl: yilDocs.length, gesamtBetrag, bezahlteBetraege, offeneBetraege, bezahlQuote: gesamtBetrag > 0 ? Math.round((bezahlteBetraege / gesamtBetrag) * 100) : 0, durchschnittBetrag: bezahltMitBetrag > 0 ? gesamtBetrag / bezahltMitBetrag : 0, monatsGruppen, typVerteilung: typZaehler, risikoVerteilung, topAbsender, geschaefstersMonat };
}
