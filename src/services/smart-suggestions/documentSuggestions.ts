import type { Dokument } from '@/store';
import type { Suggestion, SuggestionPriority, SuggestionType, SuggestionsResult } from './types';
import { makeSuggestion, tageVerbleibend } from './helpers';

export function runSmartSuggestions(dok: Dokument): SuggestionsResult {
  const suggestions: Suggestion[] = [];
  const tage = tageVerbleibend(dok.frist);
  const dok2 = dok as any;

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

  if (dok.frist && !dok.erledigt && tage !== null && tage > 0 && tage <= 60) {
    suggestions.push(makeSuggestion(
      'kalender', 'Im Kalender eintragen',
      `Frist am ${new Date(dok.frist).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} im Kalender sichern.`,
      '📅', 'mittel', 65, 'kalender', 'Zum Kalender',
      'Frist vorhanden',
    ));
  }

  if (dok.rohText && dok.rohText.length > 50) {
    suggestions.push(makeSuggestion(
      'pdf_export', 'Als PDF exportieren',
      'Professionellen Dokumentenexport erstellen.',
      '📄', 'niedrig', 40, 'pdf_export', 'PDF erstellen',
      'Dokument hat Inhalt',
    ));
  }

  if (!dok.erledigt) {
    suggestions.push(makeSuggestion(
      'teilen', 'Dokument teilen',
      'Dieses Dokument sicher mit jemandem teilen.',
      '⬆', 'niedrig', 35, 'teilen', 'Teilen',
      'Immer verfügbar',
    ));
  }

  if (dok.erledigt) {
    suggestions.push(makeSuggestion(
      'archivieren', 'Archivieren',
      'Erledigt — Dokument kann archiviert werden.',
      '📁', 'niedrig', 30, 'archivieren', 'Archivieren',
      'Dokument erledigt',
    ));
  }

  if (!dok2.aiExplained && dok.rohText && dok.rohText.length > 100) {
    suggestions.push(makeSuggestion(
      'erklären', 'Dokument verstehen',
      'KI fasst zusammen — du wählst die Sprache.',
      '🧠', 'mittel', 58, 'erklären', 'KI-Zusammenfassung öffnen',
      'Noch nicht erklärt',
    ));
  }

  if (dok.typ === 'Vertrag') {
    const rohLower = ((dok as any).rohText || '').toLowerCase();
    const kündigungsMatch = rohLower.match(/kündigung.*?(\d+)\s*(?:wochen|monat)/);
    const fristTage = kündigungsMatch
      ? (rohLower.includes('monat') ? parseInt(kündigungsMatch[1], 10) * 30 : parseInt(kündigungsMatch[1], 10) * 7)
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

  if (dok.typ === 'Versicherung') {
    suggestions.push(makeSuggestion(
      'prüfen', 'Versicherungsschutz prüfen',
      'Jährliche Überprüfung: Deckung aktuell?',
      '', 'niedrig', 42, 'prüfen', 'Details prüfen',
      'Versicherungsdokument',
    ));
  }

  if (dok.typ === 'Mahnung' && !dok.erledigt) {
    suggestions.push(makeSuggestion(
      'prüfen', 'Mahnung prüfen',
      'Berechtigung der Forderung und Mahnkosten prüfen (RDG §13).',
      '⚖️', 'hoch', 82, 'prüfen', 'Jetzt prüfen',
      'Mahnung erkannt',
    ));
  }

  suggestions.sort((a, b) => b.score - a.score);

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
