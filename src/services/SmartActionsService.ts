/**
 * Smart Actions — V12 Sprint 4
 *
 * Context-aware single-tap action builder.
 * Returns ordered action list with "Nächster Schritt" CTA.
 */

import type { Dokument } from '../store';
import { getTageVerbleibend } from '../utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActionKey =
  | 'zahlen'
  | 'einspruch'
  | 'kalender'
  | 'erinnerung'
  | 'pdf_export'
  | 'teilen'
  | 'teilen_anonym'
  | 'archivieren'
  | 'erledigt'
  | 'ai_erklären'
  | 'ai_chat'
  | 'risiko_analyse'
  | 'aufgabe_hinzufügen'
  | 'bearbeiten'
  | 'links_anzeigen'
  | 'verlängern'
  | 'kündigen'
  | 'einspruch_mail'
  | 'datev_export';

export interface SmartAction {
  key:          ActionKey;
  label:        string;
  icon:         string;
  beschreibung: string;
  isPrimary:    boolean;    // shown as big CTA button
  isDestructive:boolean;
  gruppe:       ActionGruppe;
  score:        number;     // 0–100 for ordering
  verfügbar:    boolean;
  badge?:       string;
}

export type ActionGruppe =
  | 'nächster_schritt'   // top CTA
  | 'zahlung'
  | 'rechtlich'
  | 'ki_assistent'
  | 'organisation'
  | 'export';

export interface ActionsResult {
  nächsterSchritt: SmartAction | null;
  gruppen: Record<ActionGruppe, SmartAction[]>;
  alleAktionen: SmartAction[];
}

// ── Action definitions ─────────────────────────────────────────────────────────

function makeAction(
  key: ActionKey,
  label: string,
  icon: string,
  beschreibung: string,
  gruppe: ActionGruppe,
  score: number,
  isPrimary = false,
  badge?: string,
): SmartAction {
  return { key, label, icon, beschreibung, isPrimary, isDestructive: false, gruppe, score, verfügbar: true, badge };
}

// ── Builder ────────────────────────────────────────────────────────────────────

export function buildSmartActions(dok: Dokument): ActionsResult {
  const actions: SmartAction[] = [];
  const tage = getTageVerbleibend(dok.frist);
  const dok2 = dok as any;
  const hatIBAN = !!(dok2.iban || dok.rohText && /iban/i.test(dok.rohText));

  // ── Zahlung ────────────────────────────────────────────────────────────────
  if (dok.betrag && (dok.betrag as number) > 0 && !dok.erledigt) {
    const urgent = tage !== null && tage <= 3;
    actions.push(makeAction(
      'zahlen', 'Zahlung vorbereiten', '💶',
      hatIBAN ? 'IBAN erkannt — Banking-App öffnen' : 'Zahlungsdaten vorbereiten',
      'zahlung', urgent ? 95 : 60, urgent,
      tage !== null && tage < 0 ? 'ÜBERFÄLLIG' : tage !== null && tage <= 3 ? `${tage}T` : undefined,
    ));
  }

  // ── Einspruch ──────────────────────────────────────────────────────────────
  if (['Bußgeld', 'Steuerbescheid', 'Behördenbescheid', 'Mahnung'].includes(dok.typ) && !dok.erledigt) {
    const einspruchTage = dok.typ === 'Bußgeld' ? 14 : 30;
    actions.push(makeAction(
      'einspruch', 'Einspruch erstellen', '✍️',
      `Vorlage in ${einspruchTage > 14 ? '1 Monat' : '14 Tagen'} einreichen`,
      'rechtlich', tage !== null && tage <= 5 ? 90 : 65,
      false,
      `${einspruchTage} Tage`,
    ));
    actions.push(makeAction(
      'einspruch_mail', 'Einspruch per Mail', '📧',
      'Vorgefertigte E-Mail an Behörde',
      'rechtlich', 58,
    ));
  }

  // ── Kalender ───────────────────────────────────────────────────────────────
  if (dok.frist && !dok.erledigt && tage !== null && tage > 0) {
    actions.push(makeAction(
      'kalender', 'Zum Kalender', '📅',
      `Frist am ${new Date(dok.frist).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} eintragen`,
      'organisation', 55,
    ));
  }

  // ── Erinnerung ─────────────────────────────────────────────────────────────
  if (dok.frist && !dok.erledigt && tage !== null && tage > 0 && tage <= 30) {
    actions.push(makeAction(
      'erinnerung', 'Erinnerung setzen', '🔔',
      '1–3 Tage vor Frist erinnern lassen',
      'organisation', 50,
    ));
  }

  // ── Vertrag ────────────────────────────────────────────────────────────────
  if (dok.typ === 'Vertrag') {
    actions.push(makeAction('kündigen',   'Kündigung vorbereiten', '✂️', 'Kündigungsschreiben erstellen', 'rechtlich', 48));
    actions.push(makeAction('verlängern', 'Verlängerung notieren', '🔄', 'Vertragsverlängerung im Blick behalten', 'organisation', 35));
  }

  // ── KI-Assistent ──────────────────────────────────────────────────────────
  if (dok.rohText && dok.rohText.length > 50) {
    actions.push(makeAction(
      'ai_erklären', 'Dokument erklären', '🤖',
      'KI erklärt das Dokument in Ihrer Sprache',
      'ki_assistent', 62,
    ));
    actions.push(makeAction(
      'ai_chat', 'Mit KI besprechen', '💬',
      'Fragen zum Dokument stellen',
      'ki_assistent', 55,
    ));
    actions.push(makeAction(
      'risiko_analyse', 'Risikoanalyse', '🎯',
      'Detaillierte Risikoeinschätzung',
      'ki_assistent', 48,
    ));
  }

  // ── Organisation ──────────────────────────────────────────────────────────
  actions.push(makeAction('aufgabe_hinzufügen', 'Aufgabe hinzufügen', '✅', 'Manuelle Aufgabe erstellen', 'organisation', 40));
  actions.push(makeAction('bearbeiten', 'Dokument bearbeiten', '✏️', 'Felder manuell korrigieren', 'organisation', 38));
  actions.push(makeAction('links_anzeigen', 'Verknüpfte Dokumente', '🔗', 'Ähnliche und verknüpfte Dokumente', 'organisation', 35));

  // ── Export ────────────────────────────────────────────────────────────────
  actions.push(makeAction('pdf_export', 'Als PDF exportieren', '📄', 'Professioneller PDF-Export', 'export', 42));
  actions.push(makeAction('teilen', 'Teilen', '⬆', 'Dokument sicher teilen', 'export', 38));
  actions.push(makeAction('teilen_anonym', 'Anonym teilen', '🔒', 'Persönliche Daten werden maskiert', 'export', 32));
  if (dok.betrag && (dok.betrag as number) > 0) {
    actions.push(makeAction('datev_export', 'DATEV Export', '📊', 'Für Steuerberater exportieren', 'export', 28));
  }

  // ── Erledigt / Archivieren ─────────────────────────────────────────────────
  if (!dok.erledigt) {
    actions.push({ ...makeAction('erledigt', 'Als erledigt markieren', '✅', 'Dokument abschließen', 'organisation', 30), isDestructive: false });
  } else {
    actions.push({ ...makeAction('archivieren', 'Archivieren', '📁', 'Ins Archiv verschieben', 'organisation', 25), isDestructive: false });
  }

  // Sort by score
  actions.sort((a, b) => b.score - a.score);

  // Primary CTA = highest score action
  const nächsterSchritt = actions[0] ?? null;
  if (nächsterSchritt) nächsterSchritt.isPrimary = true;

  // Group
  const gruppen: Record<ActionGruppe, SmartAction[]> = {
    nächster_schritt: nächsterSchritt ? [nächsterSchritt] : [],
    zahlung:      actions.filter(a => a.gruppe === 'zahlung'),
    rechtlich:    actions.filter(a => a.gruppe === 'rechtlich'),
    ki_assistent: actions.filter(a => a.gruppe === 'ki_assistent'),
    organisation: actions.filter(a => a.gruppe === 'organisation'),
    export:       actions.filter(a => a.gruppe === 'export'),
  };

  return { nächsterSchritt, gruppen, alleAktionen: actions };
}
