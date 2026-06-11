/**
 * D-3.1 — Nebenkosten Draft Store Context
 *
 * React Context + useReducer for in-memory draft state.
 * Not mounted anywhere yet.
 */

import React, { createContext, useContext, useReducer, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { NebenkostenDraftState, NebenkostenDraftAction } from './types';
import { nebenkostenDraftReducer } from './nebenkostenDraftReducer';
import { createInitialNebenkostenDraftState } from './initialState';

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
  const [state, dispatch] = useReducer(
    nebenkostenDraftReducer,
    initialState ?? createInitialNebenkostenDraftState(),
  );

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);

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
