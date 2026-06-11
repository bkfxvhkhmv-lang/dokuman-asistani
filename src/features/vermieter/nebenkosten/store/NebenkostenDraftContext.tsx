/**
 * D-3.1 / D-3.3 — Nebenkosten Draft Store Context
 *
 * React Context + useReducer for draft state.
 * D-3.3: feature-local AsyncStorage load/save on assistant route only.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import type { NebenkostenDraftState, NebenkostenDraftAction } from './types';
import { nebenkostenDraftReducer } from './nebenkostenDraftReducer';
import { createInitialNebenkostenDraftState } from './initialState';
import {
  clearNkDraft,
  loadNkDraft,
  saveNkDraft,
} from './persistence';

interface NebenkostenDraftContextValue {
  state: NebenkostenDraftState;
  dispatch: React.Dispatch<NebenkostenDraftAction>;
}

const NebenkostenDraftContext = createContext<NebenkostenDraftContextValue | null>(
  null,
);

interface NebenkostenDraftProviderProps {
  children: ReactNode;
  initialState?: NebenkostenDraftState;
}

export function NebenkostenDraftProvider({
  children,
  initialState,
}: NebenkostenDraftProviderProps) {
  const skipPersistence = initialState !== undefined;

  const [state, dispatch] = useReducer(
    nebenkostenDraftReducer,
    initialState ?? createInitialNebenkostenDraftState(),
    (init) =>
      skipPersistence ? { ...init, isHydrated: true } : init,
  );

  useEffect(() => {
    if (skipPersistence) return;

    let cancelled = false;

    loadNkDraft().then((saved) => {
      if (cancelled) return;
      dispatch({
        type: 'HYDRATE_DRAFT',
        payload: saved ?? createInitialNebenkostenDraftState(),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [skipPersistence]);

  useEffect(() => {
    if (skipPersistence || !state.isHydrated) return;
    void saveNkDraft(state);
  }, [state, skipPersistence]);

  const dispatchWithPersistence = useCallback(
    (action: NebenkostenDraftAction) => {
      if (action.type === 'RESET_DRAFT' && !skipPersistence) {
        void clearNkDraft();
      }
      dispatch(action);
    },
    [skipPersistence],
  );

  const value = useMemo(
    () => ({ state, dispatch: dispatchWithPersistence }),
    [state, dispatchWithPersistence],
  );

  return (
    <NebenkostenDraftContext.Provider value={value}>
      {children}
    </NebenkostenDraftContext.Provider>
  );
}

export function useNebenkostenDraft(): NebenkostenDraftContextValue {
  const context = useContext(NebenkostenDraftContext);
  if (context === null) {
    throw new Error(
      'useNebenkostenDraft must be used within a NebenkostenDraftProvider',
    );
  }
  return context;
}
