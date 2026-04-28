import React, { createContext, useContext, useReducer, useEffect, useRef, type Dispatch } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@briefpilot_v3';

// ── Domain types ──────────────────────────────────────────────────────────────

export interface Aufgabe {
  id: string;
  titel: string;
  erledigt: boolean;
  faellig?: string | null;
  prioritaet?: 'hoch' | 'mittel' | 'niedrig';
  verantwortlich?: string | null;
}

export interface DokumentVersion {
  datum: string;
  felder: Record<string, unknown>;
  altRohText?: string;
}

export interface ActionHistoryEntry {
  status: string;
  stamp: string;
  label: string;
  timeline: string;
  createdAt: string;
}

export interface Dokument {
  id: string;
  titel: string;
  typ: string;
  absender: string;
  zusammenfassung: string | null;
  warnung: string | null;
  betrag: number | null;
  waehrung: string;
  frist: string | null;
  risiko: 'hoch' | 'mittel' | 'niedrig';
  aktionen: string[];
  datum: string;
  gelesen: boolean;
  erledigt: boolean;
  uri: string | null;
  rohText: string | null;
  versionen?: DokumentVersion[];
  aufgaben?: Aufgabe[];
  etiketten?: string[];
  favorit?: boolean;
  profilId?: string | null;
  sichtbarBis?: string | null;
  iban?: string | null;
  confidence?: number | null;
  kurzfassung?: string | null;
  // Workflow
  workflowStatus?: string;
  workflowStamp?: string;
  workflowColor?: string;
  workflowTimeline?: string;
  workflowUpdatedAt?: string;
  hideFromTasks?: boolean;
  archiveBehavior?: string | null;
  actionHistory?: ActionHistoryEntry[];
  // V4 sync
  v4DocId?: string | null;
  dateiName?: string | null;
  kontaktName?: string | null;
  version?: number;
  isDeleted?: boolean;
  _lastSyncAt?: string | null;
  _hasConflict?: boolean;
  // V12 Smart Auto-Fill fields
  aktenzeichen?: string | null;
  garantieBis?: string | null;
  kundennr?: string | null;
  rechnungsnr?: string | null;
  vertragsnr?: string | null;
  zahlungszweck?: string | null;
  steuerid?: string | null;
  // V12 Categorization
  subtyp?: string | null;
  // #53 OCR bounding boxes for detected entities
  entityBoxes?: import('./services/visionApi').EntityBox[];
  // Internal
  _duplikat?: boolean;
  _aehnlichScore?: number;
  _betragAnonymisiert?: string | null;
}

export interface FilterKombi {
  id: string;
  [key: string]: unknown;
}

export interface KlassorRegel {
  absenderPattern: string;
  [key: string]: unknown;
}

export interface LernRegel {
  id: string;
  absenderPattern: string;
  felder: Record<string, unknown>;
  anwendungen: number;
  erstellt: string;
  label: string;
}

export interface Profil {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface Kisayol {
  id: string;
  [key: string]: unknown;
}

export interface AktiveSablon {
  dokId: string;
  sablonId: string;
  [key: string]: unknown;
}

export interface BudgetTarget {
  id:          string;   // 'gesamt' | typ key e.g. 'Rechnung'
  label:       string;
  limitBetrag: number;   // monthly cap in euros
}

export interface Einstellungen {
  sprache: string;
  benachrichtigungen: boolean;
  datenschutzModus: boolean;
  appSperre: boolean;
  ordnerNamen: Record<string, string>;
  filterKombis: FilterKombi[];
  eylemZinciri: { aktiv: boolean; schritte: string[] };
  klassorRegeln: KlassorRegel[];
  etikettenVerlauf: string[];
  aktiveSablonlari: AktiveSablon[];
  partnerEmail: string;
  kisayollar: Kisayol[];
  lernRegeln: LernRegel[];
  profile: Profil[];
  aktifProfilId: string | null;
  budgetTargets: BudgetTarget[];
}

export interface StoreState {
  dokumente: Dokument[];
  einstellungen: Einstellungen;
  _duplikat: boolean;
}

// ── Action types ──────────────────────────────────────────────────────────────

export type StoreAction =
  | { type: 'LOAD'; payload: Partial<StoreState> }
  | { type: 'ADD_DOKUMENT'; payload: Dokument }
  | { type: 'UPDATE_DOKUMENT'; payload: Partial<Dokument> & { id: string } }
  | { type: 'DELETE_DOKUMENT'; id: string }
  | { type: 'MARK_GELESEN'; id: string }
  | { type: 'MARK_ERLEDIGT'; id: string }
  | { type: 'UNMARK_ERLEDIGT'; id: string }
  | { type: 'APPLY_ACTION_OUTCOME'; id: string; outcome: ActionHistoryEntry & { color?: string; hideFromTasks?: boolean; archiveBehavior?: string | null } }
  | { type: 'UPDATE_EINSTELLUNGEN'; payload: Partial<Einstellungen> }
  | { type: 'TOGGLE_FAVORIT'; id: string }
  | { type: 'CLEAR_DUPLIKAT' }
  | { type: 'SAVE_FILTER_KOMBI'; payload: Omit<FilterKombi, 'id'> }
  | { type: 'DELETE_FILTER_KOMBI'; id: string }
  | { type: 'ADD_KLASSOR_REGEL'; payload: KlassorRegel }
  | { type: 'DELETE_KLASSOR_REGEL'; absenderPattern: string }
  | { type: 'ADD_AUFGABE'; dokId: string; payload: Aufgabe }
  | { type: 'UPDATE_AUFGABE'; dokId: string; payload: Partial<Aufgabe> & { id: string } }
  | { type: 'DELETE_AUFGABE'; dokId: string; aufgabeId: string }
  | { type: 'SET_SICHTBAR_BIS'; id: string; sichtbarBis: string | null }
  | { type: 'ADD_LERN_REGEL'; payload: LernRegel }
  | { type: 'DELETE_LERN_REGEL'; id: string }
  | { type: 'INCREMENT_LERN_ANWENDUNG'; id: string }
  | { type: 'ADD_PROFIL'; payload: Profil }
  | { type: 'DELETE_PROFIL'; id: string }
  | { type: 'SET_AKTIF_PROFIL'; id: string | null }
  | { type: 'SET_DOK_PROFIL'; id: string; profilId: string | null }
  | { type: 'ADD_KISAYOL'; payload: Kisayol }
  | { type: 'DELETE_KISAYOL'; id: string }
  | { type: 'ADD_SABLON'; payload: AktiveSablon }
  | { type: 'REMOVE_SABLON'; dokId: string; sablonId: string }
  | { type: 'UPDATE_ETIKETTEN'; id: string; etiketten: string[] };

import { DEMO_DOKUMENTE } from './data/demoData';

// ── Reducer ───────────────────────────────────────────────────────────────────

const VERFOLGTE_FELDER: (keyof Dokument)[] = ['betrag', 'frist', 'typ', 'risiko', 'absender'];

function reducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case 'LOAD': return { ...state, ...action.payload };

    case 'ADD_DOKUMENT': {
      if (action.payload.rohText) {
        const sig = action.payload.rohText.slice(0, 120);
        const dup = state.dokumente.some(d => d.rohText && d.rohText.slice(0, 120) === sig);
        if (dup) return { ...state, _duplikat: true };
      }
      return { ...state, dokumente: [action.payload, ...state.dokumente], _duplikat: false };
    }

    case 'UPDATE_DOKUMENT': {
      return {
        ...state,
        dokumente: state.dokumente.map(d => {
          if (d.id !== action.payload.id) return d;
          const geaendert = VERFOLGTE_FELDER.filter(f =>
            action.payload[f] !== undefined && action.payload[f] !== d[f]
          );
          const rohTextGeaendert = action.payload.rohText !== undefined && action.payload.rohText !== d.rohText;
          if (geaendert.length === 0 && !rohTextGeaendert) return { ...d, ...action.payload };
          const snapshot: Record<string, unknown> = {};
          geaendert.forEach(f => { snapshot[f] = d[f]; });
          if (rohTextGeaendert && d.rohText) snapshot._altRohText = d.rohText;
          const versionen: DokumentVersion[] = [
            { datum: new Date().toISOString(), felder: snapshot, altRohText: rohTextGeaendert ? d.rohText ?? undefined : undefined },
            ...(d.versionen || []),
          ].slice(0, 10);
          return { ...d, ...action.payload, versionen };
        }),
      };
    }

    case 'DELETE_DOKUMENT':
      return { ...state, dokumente: state.dokumente.filter(d => d.id !== action.id) };

    case 'MARK_GELESEN':
      return { ...state, dokumente: state.dokumente.map(d => d.id === action.id ? { ...d, gelesen: true } : d) };

    case 'MARK_ERLEDIGT':
      return { ...state, dokumente: state.dokumente.map(d => d.id === action.id ? { ...d, erledigt: true } : d) };

    case 'UNMARK_ERLEDIGT':
      return { ...state, dokumente: state.dokumente.map(d => d.id === action.id ? { ...d, erledigt: false } : d) };

    case 'APPLY_ACTION_OUTCOME':
      return {
        ...state,
        dokumente: state.dokumente.map(d => {
          if (d.id !== action.id) return d;
          const nextEntry: ActionHistoryEntry = {
            status: action.outcome.status,
            stamp: action.outcome.stamp,
            label: action.outcome.label,
            timeline: action.outcome.timeline,
            createdAt: action.outcome.createdAt || new Date().toISOString(),
          };
          return {
            ...d,
            workflowStatus: action.outcome.status,
            workflowStamp: action.outcome.stamp,
            workflowColor: action.outcome.color,
            workflowTimeline: action.outcome.timeline,
            workflowUpdatedAt: action.outcome.createdAt || new Date().toISOString(),
            hideFromTasks: action.outcome.hideFromTasks ?? d.hideFromTasks ?? false,
            archiveBehavior: action.outcome.archiveBehavior ?? d.archiveBehavior ?? null,
            actionHistory: [nextEntry, ...(d.actionHistory || [])].slice(0, 12),
          };
        }),
      };

    case 'UPDATE_EINSTELLUNGEN':
      return { ...state, einstellungen: { ...state.einstellungen, ...action.payload } };

    case 'TOGGLE_FAVORIT':
      return { ...state, dokumente: state.dokumente.map(d => d.id === action.id ? { ...d, favorit: !d.favorit } : d) };

    case 'CLEAR_DUPLIKAT':
      return { ...state, _duplikat: false };

    case 'SAVE_FILTER_KOMBI': {
      const kombis = [...(state.einstellungen.filterKombis || [])];
      kombis.push({ id: Date.now().toString(36), ...action.payload });
      return { ...state, einstellungen: { ...state.einstellungen, filterKombis: kombis } };
    }

    case 'DELETE_FILTER_KOMBI': {
      const kombis = (state.einstellungen.filterKombis || []).filter(k => k.id !== action.id);
      return { ...state, einstellungen: { ...state.einstellungen, filterKombis: kombis } };
    }

    case 'ADD_KLASSOR_REGEL': {
      const regeln = [...(state.einstellungen.klassorRegeln || [])];
      const exists = regeln.some(r => r.absenderPattern === action.payload.absenderPattern);
      if (!exists) regeln.push(action.payload);
      return { ...state, einstellungen: { ...state.einstellungen, klassorRegeln: regeln } };
    }

    case 'DELETE_KLASSOR_REGEL': {
      const regeln = (state.einstellungen.klassorRegeln || []).filter(r => r.absenderPattern !== action.absenderPattern);
      return { ...state, einstellungen: { ...state.einstellungen, klassorRegeln: regeln } };
    }

    case 'ADD_AUFGABE': {
      const aufgaben = [...(state.dokumente.find(d => d.id === action.dokId)?.aufgaben || []), action.payload];
      return { ...state, dokumente: state.dokumente.map(d => d.id === action.dokId ? { ...d, aufgaben } : d) };
    }

    case 'UPDATE_AUFGABE':
      return { ...state, dokumente: state.dokumente.map(d => {
        if (d.id !== action.dokId) return d;
        const aufgaben = (d.aufgaben || []).map(a => a.id === action.payload.id ? { ...a, ...action.payload } : a);
        return { ...d, aufgaben };
      })};

    case 'DELETE_AUFGABE':
      return { ...state, dokumente: state.dokumente.map(d => {
        if (d.id !== action.dokId) return d;
        return { ...d, aufgaben: (d.aufgaben || []).filter(a => a.id !== action.aufgabeId) };
      })};

    case 'SET_SICHTBAR_BIS':
      return { ...state, dokumente: state.dokumente.map(d => d.id === action.id ? { ...d, sichtbarBis: action.sichtbarBis } : d) };

    case 'ADD_LERN_REGEL': {
      const regeln = [...(state.einstellungen.lernRegeln || [])];
      const exists = regeln.some(r =>
        r.absenderPattern === action.payload.absenderPattern &&
        JSON.stringify(r.felder) === JSON.stringify(action.payload.felder)
      );
      if (exists) return state;
      regeln.push(action.payload);
      return { ...state, einstellungen: { ...state.einstellungen, lernRegeln: regeln } };
    }

    case 'DELETE_LERN_REGEL': {
      const regeln = (state.einstellungen.lernRegeln || []).filter(r => r.id !== action.id);
      return { ...state, einstellungen: { ...state.einstellungen, lernRegeln: regeln } };
    }

    case 'INCREMENT_LERN_ANWENDUNG': {
      const regeln = (state.einstellungen.lernRegeln || []).map(r =>
        r.id === action.id ? { ...r, anwendungen: (r.anwendungen || 0) + 1 } : r
      );
      return { ...state, einstellungen: { ...state.einstellungen, lernRegeln: regeln } };
    }

    case 'ADD_PROFIL': {
      const profile = [...(state.einstellungen.profile || []), action.payload];
      return { ...state, einstellungen: { ...state.einstellungen, profile } };
    }

    case 'DELETE_PROFIL': {
      const profile = (state.einstellungen.profile || []).filter(p => p.id !== action.id);
      const aktifProfilId = state.einstellungen.aktifProfilId === action.id ? null : state.einstellungen.aktifProfilId;
      return { ...state, einstellungen: { ...state.einstellungen, profile, aktifProfilId } };
    }

    case 'SET_AKTIF_PROFIL':
      return { ...state, einstellungen: { ...state.einstellungen, aktifProfilId: action.id } };

    case 'SET_DOK_PROFIL':
      return { ...state, dokumente: state.dokumente.map(d => d.id === action.id ? { ...d, profilId: action.profilId } : d) };

    case 'ADD_KISAYOL': {
      const kisayollar = [...(state.einstellungen.kisayollar || []), action.payload];
      return { ...state, einstellungen: { ...state.einstellungen, kisayollar } };
    }

    case 'DELETE_KISAYOL': {
      const kisayollar = (state.einstellungen.kisayollar || []).filter(k => k.id !== action.id);
      return { ...state, einstellungen: { ...state.einstellungen, kisayollar } };
    }

    case 'ADD_SABLON': {
      const sablonlar = [...(state.einstellungen.aktiveSablonlari || [])];
      const idx = sablonlar.findIndex(s => s.dokId === action.payload.dokId && s.sablonId === action.payload.sablonId);
      if (idx >= 0) sablonlar[idx] = action.payload;
      else sablonlar.push(action.payload);
      return { ...state, einstellungen: { ...state.einstellungen, aktiveSablonlari: sablonlar } };
    }

    case 'REMOVE_SABLON': {
      const sablonlar = (state.einstellungen.aktiveSablonlari || [])
        .filter(s => !(s.dokId === action.dokId && s.sablonId === action.sablonId));
      return { ...state, einstellungen: { ...state.einstellungen, aktiveSablonlari: sablonlar } };
    }

    case 'UPDATE_ETIKETTEN': {
      const docs = state.dokumente.map(d => d.id === action.id ? { ...d, etiketten: action.etiketten } : d);
      const alle = action.etiketten || [];
      const verlauf = [...new Set([...alle, ...(state.einstellungen.etikettenVerlauf || [])])].slice(0, 20);
      return { ...state, dokumente: docs, einstellungen: { ...state.einstellungen, etikettenVerlauf: verlauf } };
    }

    default: return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const INITIAL: StoreState = {
  dokumente: DEMO_DOKUMENTE,
  einstellungen: {
    sprache: 'Deutsch', benachrichtigungen: true, datenschutzModus: true,
    appSperre: false, ordnerNamen: {},
    filterKombis: [],
    eylemZinciri: { aktiv: false, schritte: ['hatirlatici'] },
    klassorRegeln: [],
    etikettenVerlauf: [],
    aktiveSablonlari: [],
    partnerEmail: '',
    kisayollar: [],
    lernRegeln: [],
    profile: [],
    aktifProfilId: null,
    budgetTargets: [],
  },
  _duplikat: false,
};

interface StoreContextValue {
  state: StoreState;
  dispatch: Dispatch<StoreAction>;
}

const Ctx = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const hydrated = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => {
        if (raw) {
          try { dispatch({ type: 'LOAD', payload: JSON.parse(raw) }); } catch (e) { console.warn('[Store] load parse error', e); }
        }
      })
      .catch(e => console.warn('[Store] AsyncStorage read error', e))
      .finally(() => { hydrated.current = true; });
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const { _duplikat: _, ...save } = state;
    AsyncStorage.setItem(KEY, JSON.stringify(save))
      .catch(e => console.warn('[Store] AsyncStorage write error', e));
  }, [state]);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
