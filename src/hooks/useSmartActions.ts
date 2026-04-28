import { useMemo } from 'react';
import { buildSmartActions, type ActionsResult } from '../services/SmartActionsService';
import type { Dokument } from '../store';

export function useSmartActions(dok: Dokument | null): ActionsResult | null {
  return useMemo(() => (dok ? buildSmartActions(dok) : null), [dok]);
}
