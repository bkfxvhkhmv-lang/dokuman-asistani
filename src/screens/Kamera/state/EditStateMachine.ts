import type { ImageEditMode } from '../../../modules/image-processing/types';

export type EditTransitionEvent =
  | 'open-editor'
  | 'close-editor'
  | 'start-crop'
  | 'cancel-crop'
  | 'toggle-filter-preview'
  | 'start-enhance'
  | 'begin-filter-commit'
  | 'finish-filter-commit'
  | 'start-rotate'
  | 'finish-rotate'
  | 'reset';

export interface EditStateTransition {
  currentMode: ImageEditMode;
  event: EditTransitionEvent;
  nextMode: ImageEditMode;
  allowed: boolean;
  changed: boolean;
  entering: ImageEditMode[];
  exiting: ImageEditMode[];
}

export interface EditUiState {
  toolbarMode: 'default' | 'crop' | 'rotate';
  showsCropEditor: boolean;
}

type TransitionMap = Record<ImageEditMode, Partial<Record<EditTransitionEvent, ImageEditMode>>>;

const ALLOWED_TRANSITIONS: TransitionMap = {
  none: {
    'open-editor': 'none',
    'close-editor': 'none',
    'start-crop': 'crop',
    'toggle-filter-preview': 'filter-preview',
    'start-enhance': 'enhance',
    'start-rotate': 'rotate',
    reset: 'none',
  },
  crop: {
    'cancel-crop': 'none',
    'close-editor': 'none',
    'toggle-filter-preview': 'filter-preview',
    'start-enhance': 'enhance',
    'start-rotate': 'rotate',
    reset: 'none',
  },
  'filter-preview': {
    'toggle-filter-preview': 'none',
    'start-crop': 'crop',
    'start-enhance': 'enhance',
    'start-rotate': 'rotate',
    'begin-filter-commit': 'filter-commit',
    'close-editor': 'none',
    reset: 'none',
  },
  'filter-commit': {
    'finish-filter-commit': 'none',
    'close-editor': 'none',
    reset: 'none',
  },
  rotate: {
    'finish-rotate': 'none',
    'close-editor': 'none',
    reset: 'none',
  },
  enhance: {
    'toggle-filter-preview': 'filter-preview',
    'start-crop': 'crop',
    'start-rotate': 'rotate',
    'begin-filter-commit': 'filter-commit',
    'close-editor': 'none',
    reset: 'none',
  },
};

export function getAllowedTransitions(mode: ImageEditMode) {
  return ALLOWED_TRANSITIONS[mode];
}

export function resolveEditTransition(currentMode: ImageEditMode, event: EditTransitionEvent): EditStateTransition {
  const nextMode = ALLOWED_TRANSITIONS[currentMode]?.[event];
  const allowed = typeof nextMode === 'string';
  const resolvedNextMode = nextMode ?? currentMode;
  const changed = resolvedNextMode !== currentMode;

  return {
    currentMode,
    event,
    nextMode: resolvedNextMode,
    allowed,
    changed,
    entering: changed ? [resolvedNextMode] : [],
    exiting: changed ? [currentMode] : [],
  };
}

export function deriveEditUiState(mode: ImageEditMode): EditUiState {
  return {
    toolbarMode: mode === 'crop' ? 'crop' : mode === 'rotate' ? 'rotate' : 'default',
    showsCropEditor: mode === 'crop',
  };
}

export function getEditModeLabel(mode: ImageEditMode) {
  switch (mode) {
    case 'crop':
      return 'Crop';
    case 'filter-preview':
      return 'Filter Preview';
    case 'filter-commit':
      return 'Filter Commit';
    case 'rotate':
      return 'Rotate';
    case 'enhance':
      return 'Enhance';
    case 'none':
    default:
      return 'Bereit';
  }
}

export class EditStateMachine {
  currentMode: ImageEditMode;

  constructor(currentMode: ImageEditMode = 'none') {
    this.currentMode = currentMode;
  }

  can(event: EditTransitionEvent) {
    return !!ALLOWED_TRANSITIONS[this.currentMode]?.[event];
  }

  transition(event: EditTransitionEvent) {
    const result = resolveEditTransition(this.currentMode, event);
    if (result.allowed) {
      this.currentMode = result.nextMode;
    }
    return result;
  }
}
