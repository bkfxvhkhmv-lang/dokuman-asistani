import type { StoreAction } from '../../../store';

interface ActionDefinition {
  key: string;
  label: string;
  stamp: string;
  status: string;
  color: string;
  timelineLabel: string;
  hideFromTasks: boolean;
  archiveBehavior: string | null;
}

export interface ActionOutcome {
  actionKey: string;
  label: string;
  status: string;
  color: string;
  stamp: string;
  timeline: string;
  archiveBehavior: string | null;
  hideFromTasks: boolean;
  createdAt: string;
  [key: string]: unknown;
}

const CORE_ACTION_DEFINITIONS: Record<string, ActionDefinition> = {
  pay: {
    key: 'pay', label: 'Jetzt bezahlen', stamp: 'BEZAHLT',
    status: 'bezahlt', color: 'green',
    timelineLabel: 'Heute bezahlt',
    hideFromTasks: true, archiveBehavior: 'moveTo:Steuer',
  },
  mail: {
    key: 'mail', label: 'Als E-Mail geöffnet', stamp: 'E-MAIL',
    status: 'mail_vorbereitet', color: 'blue',
    timelineLabel: 'E-Mail-Entwurf vorbereitet',
    hideFromTasks: false, archiveBehavior: null,
  },
  appeal: {
    key: 'appeal', label: 'Einspruch vorbereitet', stamp: 'EINSPRUCH',
    status: 'einspruch_vorbereitet', color: 'amber',
    timelineLabel: 'Einspruch vorbereitet',
    hideFromTasks: false, archiveBehavior: null,
  },
};

export function getCoreActionDefinition(key: string): ActionDefinition | null {
  return CORE_ACTION_DEFINITIONS[key] || null;
}

export function createActionOutcome(key: string, overrides: Record<string, unknown> = {}): ActionOutcome | null {
  const definition = getCoreActionDefinition(key);
  if (!definition) return null;

  return {
    actionKey:       definition.key,
    label:           definition.label,
    status:          definition.status,
    color:           definition.color,
    stamp:           definition.stamp,
    timeline:        definition.timelineLabel,
    archiveBehavior: definition.archiveBehavior,
    hideFromTasks:   definition.hideFromTasks,
    createdAt:       new Date().toISOString(),
    ...overrides,
  };
}

export function applyActionOutcome(
  dispatch: (action: StoreAction) => void,
  dokId: string,
  outcome: ActionOutcome | null,
): void {
  if (!dispatch || !dokId || !outcome) return;
  dispatch({ type: 'APPLY_ACTION_OUTCOME', id: dokId, outcome: outcome as any });
}
