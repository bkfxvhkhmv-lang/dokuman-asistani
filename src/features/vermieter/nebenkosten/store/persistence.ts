/**
 * D-3.3 — AsyncStorage persistence for Nebenkosten draft state.
 *
 * Pure async I/O. No React, no reducer side effects.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NebenkostenDraftState } from './types';

export const NK_DRAFT_STORAGE_KEY = '@briefpilot_nk_draft_v1';

const VALID_STATUSES = new Set(['idle', 'dirty', 'calculated']);

interface PersistedNkDraftV1 {
  version: 1;
  savedAt: string;
  draft: Omit<NebenkostenDraftState, 'isHydrated'>;
}

function parsePersistedDraft(raw: unknown): Omit<NebenkostenDraftState, 'isHydrated'> | null {
  if (!raw || typeof raw !== 'object') return null;

  const envelope = raw as Record<string, unknown>;
  if (envelope.version !== 1) return null;
  if (typeof envelope.savedAt !== 'string') return null;

  const draft = envelope.draft;
  if (!draft || typeof draft !== 'object') return null;

  const d = draft as Record<string, unknown>;
  if (!Array.isArray(d.units)) return null;
  if (!Array.isArray(d.tenancies)) return null;
  if (!Array.isArray(d.costPositions)) return null;
  if (!Array.isArray(d.results)) return null;
  if (!Array.isArray(d.validationIssues)) return null;
  if (typeof d.status !== 'string' || !VALID_STATUSES.has(d.status)) return null;

  return draft as Omit<NebenkostenDraftState, 'isHydrated'>;
}

function draftForPersistence(
  state: NebenkostenDraftState,
): Omit<NebenkostenDraftState, 'isHydrated'> {
  const { isHydrated: _omit, ...draft } = state;
  return draft;
}

export async function loadNkDraft(): Promise<NebenkostenDraftState | null> {
  try {
    const raw = await AsyncStorage.getItem(NK_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn('[NK Draft] corrupt JSON — clearing stored draft');
      await clearNkDraft();
      return null;
    }

    const draft = parsePersistedDraft(parsed);
    if (!draft) {
      console.warn('[NK Draft] invalid payload — clearing stored draft');
      await clearNkDraft();
      return null;
    }

    return { ...draft, isHydrated: false };
  } catch (e) {
    console.warn('[NK Draft] load error', e);
    return null;
  }
}

export async function saveNkDraft(state: NebenkostenDraftState): Promise<void> {
  const payload: PersistedNkDraftV1 = {
    version: 1,
    savedAt: new Date().toISOString(),
    draft: draftForPersistence(state),
  };

  try {
    await AsyncStorage.setItem(NK_DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('[NK Draft] save error', e);
  }
}

export async function clearNkDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(NK_DRAFT_STORAGE_KEY);
  } catch (e) {
    console.warn('[NK Draft] clear error', e);
  }
}

/** Mirrors save guard in NebenkostenDraftProvider. */
export function shouldSaveNkDraft(state: NebenkostenDraftState): boolean {
  return state.isHydrated;
}
