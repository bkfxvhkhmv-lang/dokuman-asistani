/**
 * Smart Summary v2 — V12 Sprint 4
 *
 * Hybrid summary engine:
 * - Local (offline): template-based from extracted fields (instant)
 * - Online: Claude AI detailed analysis via v4 API
 *
 * Three output modes:
 * - kurz:      1 sentence (always offline)
 * - mittel:    3 bullet points (offline)
 * - detailliert: full AI analysis (hybrid — online preferred, offline fallback)
 */

import type { Dokument } from '../store';
import { formatBetrag, formatFrist, getTageVerbleibend, analysiereAllgemeinRisiken } from '../utils';
import { explainDocumentSafe } from '../services/v4Api';
import { isOnline } from '../services/offlineQueue';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SummaryMode = 'kurz' | 'mittel' | 'detailliert';

export interface SummaryResult {
  mode:           SummaryMode;
  kurzSatz:       string;
  kernPunkte:     string[];    // 3 bullet points
  detailText:     string | null;
  risikoHinweise: string[];
  handlungsempfehlungen: string[];
  quelle:         'lokal' | 'ki_cloud' | 'ki_cache';
  verarbeitungMs: number;
}

// ── Local kurz summary ─────────────────────────────────────────────────────────

export function buildKurzSatz(dok: Dokument): string {
  const tage = getTageVerbleibend(dok.frist);
  const betragStr = dok.betrag ? formatBetrag(dok.betrag as number) : null;
  const fristStr = dok.frist
    ? new Date(dok.frist).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
    : null;

  const absender = dok.absender || 'Unbekannt';

  switch (dok.typ) {
    case 'Rechnung':
      if (betragStr && fristStr) return `${absender} stellt ${betragStr} in Rechnung, fällig am ${fristStr}.`;
      if (betragStr)             return `Rechnung über ${betragStr} von ${absender}.`;
      return                            `Rechnung von ${absender}.`;

    case 'Mahnung':
      if (betragStr && tage !== null) {
        if (tage < 0) return `MAHNUNG von ${absender}: ${betragStr} ist bereits überfällig!`;
        if (tage <= 3) return `Dringende Mahnung von ${absender}: ${betragStr} sofort zahlen.`;
      }
      return betragStr
        ? `Mahnung von ${absender} über ${betragStr} — sofort reagieren.`
        : `Mahnung von ${absender} — sofortiger Handlungsbedarf.`;

    case 'Bußgeld':
      return betragStr
        ? `Bußgeldbescheid von ${absender}: ${betragStr} zahlen oder Einspruch innerhalb 14 Tagen.`
        : `Bußgeldbescheid von ${absender} — Einspruchsoption prüfen.`;

    case 'Steuerbescheid':
      return betragStr
        ? `Steuerbescheid von ${absender}: ${betragStr} — Einspruch innerhalb 1 Monat möglich.`
        : `Steuerbescheid vom Finanzamt — Prüfung und ggf. Einspruch erforderlich.`;

    case 'Kündigung':
      return fristStr
        ? `Kündigung von ${absender} zum ${fristStr} — Fristen und Rechte prüfen.`
        : `Kündigungsschreiben von ${absender} — rechtliche Prüfung empfohlen.`;

    case 'Versicherung':
      return `Versicherungsdokument von ${absender} — Deckung und Laufzeit prüfen.`;

    case 'Vertrag':
      return fristStr
        ? `Vertrag mit ${absender} — Laufzeit bis ${fristStr}.`
        : `Vertrag mit ${absender} — Bedingungen und Fristen prüfen.`;

    case 'Termin':
      return fristStr
        ? `Termin am ${fristStr} bei ${absender} — im Kalender eintragen.`
        : `Terminbestätigung von ${absender}.`;

    case 'Behördenbescheid':
      return fristStr
        ? `Behördenpost von ${absender} — Reaktion bis ${fristStr} erforderlich.`
        : `Offizielles Schreiben von ${absender} — Fristen beachten.`;

    default:
      if (betragStr && fristStr) return `${dok.typ} von ${absender}: ${betragStr} bis ${fristStr}.`;
      if (betragStr)             return `${dok.typ} über ${betragStr} von ${absender}.`;
      return                            `${dok.typ} von ${absender}.`;
  }
}

// ── Local 3-bullet summary ────────────────────────────────────────────────────

export function buildKernPunkte(dok: Dokument): string[] {
  const tage = getTageVerbleibend(dok.frist);
  const betragStr = dok.betrag ? formatBetrag(dok.betrag as number) : null;
  const fristStr = dok.frist
    ? `${new Date(dok.frist).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}${tage !== null ? ` (${tage < 0 ? `${Math.abs(tage)} Tage überfällig` : tage === 0 ? 'Heute!' : `${tage} Tage`})` : ''}`
    : null;

  const punkte: string[] = [];

  // 1. Was ist das Dokument?
  punkte.push(`📄 ${dok.typ} von ${dok.absender || 'Unbekannt'}`);

  // 2. Wichtigste Zahlen
  const zahlen: string[] = [];
  if (betragStr)              zahlen.push(`Betrag: ${betragStr}`);
  if (fristStr)               zahlen.push(`Frist: ${fristStr}`);
  if ((dok as any).aktenzeichen) zahlen.push(`AZ: ${(dok as any).aktenzeichen}`);
  if (zahlen.length > 0) punkte.push(`💡 ${zahlen.join(' · ')}`);
  else punkte.push(`💡 Kein Betrag oder Frist erkannt`);

  // 3. Was tun?
  const risiken = analysiereAllgemeinRisiken(dok);
  if (risiken.length > 0) {
    punkte.push(`⚠️ ${risiken[0].text}`);
  } else if (dok.erledigt) {
    punkte.push(`✅ Bereits erledigt`);
  } else if (dok.aktionen?.includes('zahlen')) {
    punkte.push(`💶 Zahlung vorbereiten`);
  } else if (dok.aktionen?.includes('einspruch')) {
    punkte.push(`✍️ Einspruchoption prüfen`);
  } else {
    punkte.push(`📌 Dokument prüfen und ggf. archivieren`);
  }

  return punkte.slice(0, 3);
}

// ── Local risk hints ───────────────────────────────────────────────────────────

function buildRisikoHinweise(dok: Dokument): string[] {
  const risiken = analysiereAllgemeinRisiken(dok);
  return risiken.map(r => `${r.icon} ${r.text}`).slice(0, 3);
}

// ── Local action recommendations ──────────────────────────────────────────────

function buildHandlungsempfehlungen(dok: Dokument): string[] {
  const empfehlungen: string[] = [];
  const tage = getTageVerbleibend(dok.frist);

  if (tage !== null && tage < 0 && dok.betrag) empfehlungen.push('🚨 Zahlung sofort veranlassen — Frist abgelaufen');
  else if (tage !== null && tage <= 3 && dok.betrag) empfehlungen.push(`💶 Zahlung in ${tage} Tag${tage !== 1 ? 'en' : ''} fällig — jetzt vorbereiten`);
  if (['Bußgeld', 'Steuerbescheid'].includes(dok.typ)) empfehlungen.push('✍️ Einspruchsmöglichkeit innerhalb der Frist prüfen');
  if (dok.typ === 'Mahnung') empfehlungen.push('📞 Kontakt aufnehmen und Ratenzahlung prüfen');
  if (dok.typ === 'Vertrag') empfehlungen.push('📋 Kündigungsfristen und Verlängerungsklauseln prüfen');
  if (!dok.frist && ['Rechnung', 'Mahnung'].includes(dok.typ)) empfehlungen.push('⚠️ Frist manuell prüfen und eintragen');

  return empfehlungen.slice(0, 3);
}

// ── Offline summary (full local) ──────────────────────────────────────────────

export function buildLocalSummary(dok: Dokument, mode: SummaryMode): SummaryResult {
  const start = Date.now();
  const kurzSatz = buildKurzSatz(dok);
  const kernPunkte = buildKernPunkte(dok);
  const risikoHinweise = buildRisikoHinweise(dok);
  const handlungsempfehlungen = buildHandlungsempfehlungen(dok);

  let detailText: string | null = null;
  if (mode === 'detailliert') {
    detailText = [
      `**${dok.typ} von ${dok.absender}**`,
      '',
      kurzSatz,
      '',
      '**Kernpunkte:**',
      ...kernPunkte.map(p => `• ${p}`),
      '',
      risikoHinweise.length > 0 ? `**Risiken:**\n${risikoHinweise.map(r => `• ${r}`).join('\n')}` : '',
      handlungsempfehlungen.length > 0 ? `\n**Empfehlungen:**\n${handlungsempfehlungen.map(e => `• ${e}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');
  }

  return {
    mode,
    kurzSatz,
    kernPunkte,
    detailText,
    risikoHinweise,
    handlungsempfehlungen,
    quelle: 'lokal',
    verarbeitungMs: Date.now() - start,
  };
}

// ── Hybrid summary (local + optional AI) ──────────────────────────────────────

export async function buildSmartSummary(
  dok: Dokument,
  mode: SummaryMode,
  lang = 'de',
): Promise<SummaryResult> {
  const local = buildLocalSummary(dok, mode);

  // For kurz + mittel → local is sufficient
  if (mode !== 'detailliert' || !dok.v4DocId) return local;

  // Try online AI for detailed mode
  try {
    const online = await isOnline();
    if (!online) return local;

    const explainResult = await explainDocumentSafe(dok.v4DocId, lang);
    if (!explainResult?.text) return local;

    return {
      ...local,
      detailText: explainResult.text,
      quelle: 'ki_cloud',
    };
  } catch {
    return local;
  }
}

// ── Cached summary check ──────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@bp_v12_summary_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function getCachedSummary(dokId: string, mode: SummaryMode): Promise<SummaryResult | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${dokId}_${mode}`);
    if (!raw) return null;
    const { result, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return { ...result, quelle: 'ki_cache' };
  } catch { return null; }
}

export async function cacheSummary(dokId: string, mode: SummaryMode, result: SummaryResult): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}${dokId}_${mode}`, JSON.stringify({ result, ts: Date.now() }));
  } catch (e) { console.warn('[SmartSummaryService] cacheSummary error', e); }
}
