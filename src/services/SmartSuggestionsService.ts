/**
 * Smart Suggestions — V12 Sprint 2
 *
 * Context-aware suggestion engine: offline-first, no API needed.
 * Evaluates document fields, timing, risk, type → ranked action suggestions.
 */

import type { Dokument } from '../store';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SuggestionType =
  | 'zahlen'
  | 'einspruch'
  | 'pdf_export'
  | 'teilen'
  | 'archivieren'
  | 'kalender'
  | 'erinnerung'
  | 'erklären'
  | 'aufgabe'
  | 'verknüpfen'
  | 'kündigen'
  | 'verlängern'
  | 'prüfen';

export type SuggestionPriority = 'kritisch' | 'hoch' | 'mittel' | 'niedrig';

export interface Suggestion {
  id: string;
  type: SuggestionType;
  titel: string;
  beschreibung: string;
  icon: string;
  priority: SuggestionPriority;
  score: number;              // 0–100, for sorting
  aktion: string;             // action key for handler
  aktionLabel: string;
  kontext: string;            // why this suggestion was generated
  verfallsdatum?: string;     // ISO — show only until this date
  badge?: string;             // e.g. "3 Tage" shown on suggestion chip
}

export interface SuggestionsResult {
  suggestions: Suggestion[];
  topSuggestion: Suggestion | null;
  kategorien: Record<SuggestionPriority, Suggestion[]>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tageVerbleibend(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function makeSuggestion(
  type: SuggestionType,
  titel: string,
  beschreibung: string,
  icon: string,
  priority: SuggestionPriority,
  score: number,
  aktion: string,
  aktionLabel: string,
  kontext: string,
  extras: Partial<Suggestion> = {},
): Suggestion {
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type, titel, beschreibung, icon, priority, score, aktion, aktionLabel, kontext,
    ...extras,
  };
}

// ── Rule engine ───────────────────────────────────────────────────────────────

export function runSmartSuggestions(dok: Dokument): SuggestionsResult {
  const suggestions: Suggestion[] = [];
  const tage = tageVerbleibend(dok.frist);
  const dok2 = dok as any;

  // ── 1. Zahlung ──────────────────────────────────────────────────────────────
  if (dok.betrag && (dok.betrag as number) > 0 && !dok.erledigt) {
    if (tage !== null && tage < 0) {
      suggestions.push(makeSuggestion(
        'zahlen', 'Sofort zahlen',
        `Zahlung überfällig! ${(dok.betrag as number).toFixed(2)} € sofort überweisen.`,
        '🚨', 'kritisch', 98, 'zahlen', 'Jetzt zahlen',
        'Frist ist abgelaufen',
        { badge: 'Überfällig!' },
      ));
    } else if (tage !== null && tage <= 3) {
      suggestions.push(makeSuggestion(
        'zahlen', 'Zahlung vorbereiten',
        `Frist in ${tage} Tag${tage !== 1 ? 'en' : ''} — ${(dok.betrag as number).toFixed(2)} € überweisen.`,
        '€', 'kritisch', 95, 'zahlen', 'Jetzt zahlen',
        `Nur noch ${tage} Tage`,
        { badge: `${tage} Tage`, verfallsdatum: dok.frist ?? undefined },
      ));
    } else if (tage !== null && tage <= 7) {
      suggestions.push(makeSuggestion(
        'zahlen', 'Diese Woche zahlen',
        `Frist in ${tage} Tagen — ${(dok.betrag as number).toFixed(2)} € überweisen.`,
        '€', 'hoch', 80, 'zahlen', 'Zahlung vorbereiten',
        `Frist in ${tage} Tagen`,
        { badge: `${tage} Tage` },
      ));
    } else if (dok.typ === 'Rechnung' && !dok.erledigt) {
      suggestions.push(makeSuggestion(
        'zahlen', 'Zahlung planen',
        `Rechnung über ${(dok.betrag as number).toFixed(2)} € noch offen.`,
        '€', 'mittel', 55, 'zahlen', 'Zahlung vorbereiten',
        'Offene Zahlung',
      ));
    }
  }

  // ── 2. Einspruch ───────────────────────────────────────────────────────────
  if (['Bußgeld', 'Steuerbescheid', 'Behördenbescheid'].includes(dok.typ) && !dok.erledigt) {
    const einspruchTage = dok.typ === 'Bußgeld' ? 14 : 30;
    const fristAbEingang = tage !== null ? tage : einspruchTage;
    if (fristAbEingang <= einspruchTage && fristAbEingang > 0) {
      suggestions.push(makeSuggestion(
        'einspruch', 'Einspruch prüfen',
        `${dok.typ === 'Bußgeld' ? '14 Tage' : '1 Monat'} Einspruchsfrist beachten.`,
        '✍️', fristAbEingang <= 5 ? 'kritisch' : 'hoch', 88, 'einspruch', 'Einspruch erstellen',
        `Einspruchsfrist: ${einspruchTage} Tage`,
        { badge: `${einspruchTage}T Frist` },
      ));
    } else if (fristAbEingang > einspruchTage) {
      suggestions.push(makeSuggestion(
        'einspruch', 'Einspruch möglich',
        `Sie können fristgerecht Einspruch einlegen.`,
        '✍️', 'mittel', 60, 'einspruch', 'Einspruch erstellen',
        'Einspruchsoption',
      ));
    }
  }

  // ── 3. Erinnerung ─────────────────────────────────────────────────────────
  if (dok.frist && !dok.erledigt && tage !== null && tage > 0 && tage <= 30) {
    const hatErinnerung = (dok.aufgaben || []).some(a => (a as any).type === 'reminder');
    if (!hatErinnerung) {
      suggestions.push(makeSuggestion(
        'erinnerung', 'Erinnerung einrichten',
        `Erinnerung ${tage <= 7 ? '1 Tag' : '3 Tage'} vor der Frist.`,
        '🔔', tage <= 7 ? 'hoch' : 'mittel', 72, 'erinnerung', 'Erinnerung setzen',
        'Frist ohne Erinnerung',
        { badge: `${tage <= 7 ? '1T' : '3T'} vorher` },
      ));
    }
  }

  // ── 4. Kalender ────────────────────────────────────────────────────────────
  if (dok.frist && !dok.erledigt && tage !== null && tage > 0 && tage <= 60) {
    suggestions.push(makeSuggestion(
      'kalender', 'Im Kalender eintragen',
      `Frist am ${new Date(dok.frist).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} im Kalender sichern.`,
      '📅', 'mittel', 65, 'kalender', 'Zum Kalender',
      'Frist vorhanden',
    ));
  }

  // ── 5. PDF Export ──────────────────────────────────────────────────────────
  if (dok.rohText && dok.rohText.length > 50) {
    suggestions.push(makeSuggestion(
      'pdf_export', 'Als PDF exportieren',
      'Professionellen Dokumentenexport erstellen.',
      '📄', 'niedrig', 40, 'pdf_export', 'PDF erstellen',
      'Dokument hat Inhalt',
    ));
  }

  // ── 6. Teilen ──────────────────────────────────────────────────────────────
  if (!dok.erledigt) {
    suggestions.push(makeSuggestion(
      'teilen', 'Dokument teilen',
      'Dieses Dokument sicher mit jemandem teilen.',
      '⬆', 'niedrig', 35, 'teilen', 'Teilen',
      'Immer verfügbar',
    ));
  }

  // ── 7. Archivieren ─────────────────────────────────────────────────────────
  if (dok.erledigt) {
    suggestions.push(makeSuggestion(
      'archivieren', 'Archivieren',
      'Erledigt — Dokument kann archiviert werden.',
      '📁', 'niedrig', 30, 'archivieren', 'Archivieren',
      'Dokument erledigt',
    ));
  }

  // ── 8. KI-Erklärung ────────────────────────────────────────────────────────
  if (!dok2.aiExplained && dok.rohText && dok.rohText.length > 100) {
    suggestions.push(makeSuggestion(
      'erklären', 'Dokument erklären lassen',
      'KI erklärt dieses Dokument in Ihrer Sprache.',
      '🤖', 'mittel', 58, 'erklären', 'KI-Erklärung öffnen',
      'Noch nicht erklärt',
    ));
  }

  // ── 9. Vertrag kündigen / verlängern ──────────────────────────────────────
  if (dok.typ === 'Vertrag') {
    const rohLower = ((dok as any).rohText || '').toLowerCase();
    const kündigungsMatch = rohLower.match(/kündigung.*?(\d+)\s*(?:wochen|monat)/);
    const fristTage = kündigungsMatch
      ? (rohLower.includes('monat') ? parseInt(kündigungsMatch[1]) * 30 : parseInt(kündigungsMatch[1]) * 7)
      : 30;
    if (tage !== null && tage > 0 && tage <= fristTage + 30) {
      suggestions.push(makeSuggestion(
        'kündigen', 'Vertrag kündigen?',
        `Kündigungsfrist ca. ${fristTage} Tage — rechtzeitig entscheiden.`,
        '✂️', 'mittel', 65, 'kündigen', 'Kündigung prüfen',
        `Vertrag läuft ab`,
        { badge: `${fristTage}T Frist` },
      ));
    } else {
      suggestions.push(makeSuggestion(
        'verlängern', 'Vertrag prüfen',
        'Laufzeit und Konditionen prüfen.',
        '📋', 'niedrig', 38, 'verlängern', 'Vertrag anzeigen',
        'Vertragsdokument',
      ));
    }
  }

  // ── 10. Versicherung prüfen ───────────────────────────────────────────────
  if (dok.typ === 'Versicherung') {
    suggestions.push(makeSuggestion(
      'prüfen', 'Versicherungsschutz prüfen',
      'Jährliche Überprüfung: Deckung aktuell?',
      '', 'niedrig', 42, 'prüfen', 'Details prüfen',
      'Versicherungsdokument',
    ));
  }

  // ── 11. Mahnung → sofort handeln ─────────────────────────────────────────
  if (dok.typ === 'Mahnung' && !dok.erledigt) {
    suggestions.push(makeSuggestion(
      'prüfen', 'Mahnung prüfen',
      'Berechtigung der Forderung und Mahnkosten prüfen (RDG §13).',
      '⚖️', 'hoch', 82, 'prüfen', 'Jetzt prüfen',
      'Mahnung erkannt',
    ));
  }

  // ── Sort by score desc ─────────────────────────────────────────────────────
  suggestions.sort((a, b) => b.score - a.score);

  // Remove duplicate types (keep highest score per type)
  const seen = new Set<SuggestionType>();
  const deduplicated = suggestions.filter(s => {
    if (seen.has(s.type)) return false;
    seen.add(s.type);
    return true;
  });

  const kategorien: Record<SuggestionPriority, Suggestion[]> = {
    kritisch: deduplicated.filter(s => s.priority === 'kritisch'),
    hoch:     deduplicated.filter(s => s.priority === 'hoch'),
    mittel:   deduplicated.filter(s => s.priority === 'mittel'),
    niedrig:  deduplicated.filter(s => s.priority === 'niedrig'),
  };

  return {
    suggestions: deduplicated,
    topSuggestion: deduplicated[0] ?? null,
    kategorien,
  };
}

// ── Multi-document suggestions (home screen) ───────────────────────────────────

export interface HomeSuggestion {
  icon: string;
  titel: string;
  beschreibung: string;
  priority: SuggestionPriority;
  dokId?: string;
  aktion: string;
}

export function runHomeSuggestions(docs: Dokument[]): HomeSuggestion[] {
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const result: HomeSuggestion[] = [];

  // Überfällige
  const überfällig = docs.filter(d => !d.erledigt && d.frist && new Date(d.frist) < heute);
  if (überfällig.length > 0) {
    result.push({
      icon: '🚨', titel: `${überfällig.length} überfällige Dokument${überfällig.length > 1 ? 'e' : ''}`,
      beschreibung: `${überfällig.map(d => d.absender || d.typ).slice(0, 2).join(', ')}${überfällig.length > 2 ? ` +${überfällig.length - 2}` : ''}`,
      priority: 'kritisch', aktion: 'filter_überfällig',
    });
  }

  // Diese Woche fällig
  const dieseWoche = docs.filter(d => {
    if (!d.frist || d.erledigt) return false;
    const t = tageVerbleibend(d.frist);
    return t !== null && t >= 0 && t <= 7;
  });
  if (dieseWoche.length > 0 && überfällig.length === 0) {
    result.push({
      icon: '⏰', titel: `${dieseWoche.length} Dokument${dieseWoche.length > 1 ? 'e' : ''} diese Woche fällig`,
      beschreibung: dieseWoche.slice(0, 2).map(d => d.titel).join(', '),
      priority: 'hoch', aktion: 'filter_diese_woche',
    });
  }

  // Ungelesen
  const ungelesen = docs.filter(d => !d.gelesen && !d.erledigt);
  if (ungelesen.length >= 3) {
    result.push({
      icon: '📬', titel: `${ungelesen.length} ungelesene Dokumente`,
      beschreibung: 'Neue Dokumente warten auf Ihre Aufmerksamkeit',
      priority: 'mittel', aktion: 'filter_ungelesen',
    });
  }

  // Hohe Gesamtsumme offen
  const offenBetrag = docs.filter(d => !d.erledigt && d.betrag && (d.betrag as number) > 0)
    .reduce((s, d) => s + ((d.betrag as number) || 0), 0);
  if (offenBetrag >= 100) {
    result.push({
      icon: '€', titel: `${offenBetrag.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} € offen`,
      beschreibung: 'Gesamtsumme aller offenen Zahlungen',
      priority: offenBetrag >= 500 ? 'hoch' : 'mittel',
      aktion: 'filter_offen_betrag',
    });
  }

  return result.slice(0, 5);
}
