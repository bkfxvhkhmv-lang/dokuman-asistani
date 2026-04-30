import type { DocState } from '@/types/docLifecycle';

/**
 * Regeln für spätere Scheduling-Integration (Push):
 * +1 Tag ohne Bearbeitung → sanfter Ping
 * +3 Tage → Deadline-Nähe
 * deadline − 1 → „Morgen Frist“
 * am Fristtag → „Heute letzter Tag“
 *
 * Produkt soll `DocState`, Frist (`frist`/ISO), `updatedAt`/letzte Nutzeraktion kennen.
 */
export type ReminderRuleId = 'idle_1d' | 'idle_3d' | 'deadline_minus_1' | 'deadline_day';

export function reminderTitleDe(rule: ReminderRuleId): string {
  switch (rule) {
    case 'idle_1d':
      return 'Noch nicht erledigt';
    case 'idle_3d':
      return 'Frist rückt näher';
    case 'deadline_minus_1':
      return 'Morgen ist Frist';
    case 'deadline_day':
      return 'Heute Frist';
    default:
      return 'Erinnerung';
  }
}

export function reminderBodyDe(rule: ReminderRuleId, docTitle: string): string {
  const t = docTitle.trim() || 'Dieser Beleg';
  switch (rule) {
    case 'idle_1d':
      return `${t}: Du hast noch keine Aktion ausgeführt.`;
    case 'idle_3d':
      return `${t}: Bitte rechtzeitig bearbeiten.`;
    case 'deadline_minus_1':
      return `${t}: Letzter Tag vor der Frist — morgen fällig.`;
    case 'deadline_day':
      return `${t}: Frist endet heute.`;
    default:
      return t;
  }
}

/** Hilfsfunktion — echtes Scheduling folgt in Services (expo-notifications). */
export function docStateAllowsReminders(s: DocState): boolean {
  return s === 'action_needed' || s === 'processing';
}
