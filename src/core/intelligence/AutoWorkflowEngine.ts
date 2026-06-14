/**
 * AutoWorkflowEngine
 * Generiert automatische Workflows basierend auf Dokumenttyp, Institution und Risikostufe.
 */
import { InstitutionBehaviorModel } from '@/core/intelligence/InstitutionBehaviorModel';
import { RuleEngineV4 } from '@/core/rules/RuleEngineV4';
import { safeDisplayTitel } from '@/utils/displaySanitizer';

// ── Typen ─────────────────────────────────────────────────────────────────────

export type WorkflowStepType =
  | 'notify'
  | 'calendar'
  | 'einspruch_draft'
  | 'payment_prefill'
  | 'label'
  | 'archive'
  | 'share_partner'
  | 'ai_explain'
  | 'task_create'
  | 'escalate';

export interface WorkflowStep {
  id:          string;
  type:        WorkflowStepType;
  label:       string;
  emoji:       string;
  auto:        boolean;        // true → automatisch ausführen, false → Benutzerbestätigung erforderlich
  payload?:    Record<string, any>;
}

export interface GeneratedWorkflow {
  docId:       string;
  title:       string;
  description: string;
  steps:       WorkflowStep[];
  trigger:     string;         // welche Regel diesen Workflow ausgelöst hat
  priority:    'high' | 'medium' | 'low';
  generatedAt: string;
}

// ── Workflow-Vorlagen ─────────────────────────────────────────────────────────

type WorkflowTemplate = {
  trigger:     string;
  priority:    GeneratedWorkflow['priority'];
  description: string;
  steps:       Omit<WorkflowStep, 'id'>[];
};

function displayTitleFor(dok: Record<string, any>): string {
  return safeDisplayTitel(dok.titel, dok.typ, dok.confidence);
}

const TEMPLATES: Record<string, WorkflowTemplate> = {
  mahnung: {
    trigger: 'Mahnung erkannt',
    priority: 'high',
    description: 'Mahnung erfordert schnelles Handeln',
    steps: [
      { type: 'notify',         label: 'Dringende Benachrichtigung senden', emoji: '🔔', auto: true },
      { type: 'calendar',       label: 'Frist im Kalender eintragen',       emoji: '📅', auto: true },
      { type: 'payment_prefill',label: 'Zahlungsdaten ausfüllen',           emoji: '💶', auto: false },
      { type: 'einspruch_draft',label: 'Einspruchentwurf erstellen',        emoji: '✍️', auto: false },
      { type: 'escalate',       label: 'An Berater weiterleiten',           emoji: '🆘', auto: false },
    ],
  },
  finanzamt: {
    trigger: 'Finanzamt-Schreiben erkannt',
    priority: 'high',
    description: 'Steuerbescheid → in der Regel innerhalb von 30 Tagen handeln',
    steps: [
      { type: 'notify',         label: 'Benachrichtigung senden',           emoji: '🔔', auto: true },
      { type: 'calendar',       label: 'Frist im Kalender eintragen',       emoji: '📅', auto: true },
      { type: 'ai_explain',     label: 'KI-Erklärung abrufen',             emoji: '🧠', auto: true },
      { type: 'einspruch_draft',label: 'Einspruchentwurf',                  emoji: '✍️', auto: false },
      { type: 'task_create',    label: 'Aufgabe erstellen: Steuerberater prüfen', emoji: '✅', auto: false,
        payload: { titel: 'Steuerberater für diesen Bescheid kontaktieren' } },
    ],
  },
  bussgeld: {
    trigger: 'Bußgeldbescheid',
    priority: 'high',
    description: 'Bußgeld → innerhalb von 14 Tagen zahlen oder Einspruch einlegen',
    steps: [
      { type: 'notify',         label: 'Dringende Benachrichtigung',        emoji: '🔔', auto: true },
      { type: 'calendar',       label: 'Frist im Kalender eintragen',       emoji: '📅', auto: true },
      { type: 'payment_prefill',label: 'Zahlungsdaten ausfüllen',           emoji: '💶', auto: false },
      { type: 'einspruch_draft',label: 'Einspruch prüfen',                  emoji: '✍️', auto: false },
    ],
  },
  rechnung: {
    trigger: 'Rechnung erkannt',
    priority: 'medium',
    description: 'Rechnung → Zahlung rechtzeitig vornehmen',
    steps: [
      { type: 'calendar',       label: 'Zahlungsdatum im Kalender eintragen', emoji: '📅', auto: true },
      { type: 'payment_prefill',label: 'Zahlungsdaten ausfüllen',             emoji: '💶', auto: false },
      { type: 'label',          label: 'Etikett: Rechnung',                   emoji: '🏷', auto: true,
        payload: { etikett: 'Rechnung' } },
    ],
  },
  behörde: {
    trigger: 'Behördenpost erkannt',
    priority: 'medium',
    description: 'Behördenpost → lesen, archivieren und bei Bedarf reagieren',
    steps: [
      { type: 'ai_explain',     label: 'KI-Erklärung abrufen',             emoji: '🧠', auto: true },
      { type: 'calendar',       label: 'Termine im Kalender eintragen',    emoji: '📅', auto: false },
      { type: 'archive',        label: 'Archivieren',                       emoji: '🗂', auto: false },
    ],
  },
  default: {
    trigger: 'Neues Dokument',
    priority: 'low',
    description: 'Standard-Dokumentenverarbeitung',
    steps: [
      { type: 'ai_explain',     label: 'KI-Erklärung abrufen',             emoji: '🧠', auto: true },
      { type: 'label',          label: 'Etikett hinzufügen',               emoji: '🏷', auto: false },
      { type: 'archive',        label: 'Archivieren',                       emoji: '🗂', auto: false },
    ],
  },
};

// ── Hilfsfunktion ─────────────────────────────────────────────────────────────

function selectTemplate(dok: Record<string, any>): [string, WorkflowTemplate] {
  const text = [dok.absender, dok.rohText, dok.titel, dok.zusammenfassung, dok.typ]
    .filter(Boolean).join(' ').toLowerCase();

  if (/mahnung|inkasso|pfändung/.test(text))    return ['mahnung', TEMPLATES.mahnung];
  if (/finanzamt|steuerbescheid/.test(text))    return ['finanzamt', TEMPLATES.finanzamt];
  if (/bußgeld|bussgeldbescheid/.test(text))    return ['bussgeld', TEMPLATES.bussgeld];
  if (/rechnung|invoice|faktura/.test(text))    return ['rechnung', TEMPLATES.rechnung];
  if (/amt|behörde|bundesamt/.test(text))       return ['behörde', TEMPLATES.behörde];

  return ['default', TEMPLATES.default];
}

// ── Hauptklasse ───────────────────────────────────────────────────────────────

export class AutoWorkflowEngine {

  static async generate(dok: Record<string, any>): Promise<GeneratedWorkflow> {
    const [templateKey, template] = selectTemplate(dok);

    // Schritte mit Institutionsdaten anreichern
    let extraSteps: Omit<WorkflowStep, 'id'>[] = [];
    if (dok.absender) {
      const sug = await InstitutionBehaviorModel.getSuggestion(dok.absender);
      if (sug?.likelyActions.includes('kalender') && !template.steps.find(s => s.type === 'calendar')) {
        extraSteps.push({ type: 'calendar', label: 'Frist im Kalender eintragen (aus Institutionsdaten)', emoji: '📅', auto: false });
      }
    }

    // Partner-Benachrichtigung bei hoher Dringlichkeit hinzufügen
    const urgency = RuleEngineV4.urgencyScore(dok);
    if (urgency >= 70 && template.priority === 'high') {
      extraSteps.push({ type: 'share_partner', label: 'Partner benachrichtigen', emoji: '👥', auto: false });
    }

    const allSteps = [...template.steps, ...extraSteps].map((s, i) => ({
      ...s,
      id: `step_${i}_${Date.now()}`,
    }));

    return {
      docId:       dok.id,
      title:       `${template.steps[0]?.emoji ?? '📋'} ${displayTitleFor(dok) || 'Dokument'}`,
      description: template.description,
      steps:       allSteps,
      trigger:     template.trigger,
      priority:    template.priority,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Automatische Schritte ausführen (Action-Map wird injiziert) ───────────────

  static async executeAutoSteps(
    workflow: GeneratedWorkflow,
    handlers: Partial<Record<WorkflowStepType, (payload?: Record<string, any>) => Promise<void> | void>>,
  ): Promise<string[]> {
    const executed: string[] = [];
    for (const step of workflow.steps.filter(s => s.auto)) {
      const handler = handlers[step.type];
      if (handler) {
        try {
          await handler(step.payload);
          executed.push(step.id);
        } catch {
          // Fehler ignorieren
        }
      }
    }
    return executed;
  }
}
