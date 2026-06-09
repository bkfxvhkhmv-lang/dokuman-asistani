/**
 * Dokuman + alt-varlik (aufgabe, etiketten) reducer'lari.
 *
 * Yalnizca `state.dokumente` dilimini degistiren aksiyonlari ele alir.
 * `UPDATE_ETIKETTEN` istisna: hem dokumana hem einstellungen.etikettenVerlauf'a
 * yazdigi icin tam state aliyor ve donduruyor.
 */
import type { StoreAction } from '@/store/actions';
import type {
  StoreState,
  Dokument,
  DokumentVersion,
  ActionHistoryEntry,
} from '@/store/types';
import { followKurzfassungMitKernfeldern } from '@/store/kurzfassungSync';
import { createDemoDokumente } from '@/features/demo/demoDocuments';

/** Versiyonlanmasi gereken alanlar — degistirildiginde
 *  Dokument.versionen icine snapshot dusurulur. */
const VERFOLGTE_FELDER: (keyof Dokument)[] = ['betrag', 'frist', 'typ', 'risiko', 'absender'];

/* -------------------------------------------------------------------------- */
/* PUBLIC API — Tek giris noktasi: documentReducer                            */
/* -------------------------------------------------------------------------- */

/** Dokument-touching aksiyonlari uygular. Aksiyon bu dosyaya ait
 *  degilse `null` doner; root reducer baska bir reducer'a yonlendirir. */
export function documentReducer(state: StoreState, action: StoreAction): StoreState | null {
  switch (action.type) {
    case 'ADD_DOKUMENT':           return addDokument(state, action.payload);
    case 'UPDATE_DOKUMENT':        return updateDokument(state, action.payload);
    case 'DELETE_DOKUMENT':        return deleteDokument(state, action.id);
    case 'MARK_GELESEN':           return markFlag(state, action.id, 'gelesen', true);
    case 'MARK_ERLEDIGT':          return markFlag(state, action.id, 'erledigt', true);
    case 'UNMARK_ERLEDIGT':        return markFlag(state, action.id, 'erledigt', false);
    case 'TOGGLE_FAVORIT':         return toggleFavorit(state, action.id);
    case 'SET_SICHTBAR_BIS':       return setSichtbarBis(state, action.id, action.sichtbarBis);
    case 'APPLY_ACTION_OUTCOME':   return applyActionOutcome(state, action.id, action.outcome);
    case 'SET_DOK_PROFIL':         return setDokProfil(state, action.id, action.profilId);
    case 'ADD_AUFGABE':            return addAufgabe(state, action.dokId, action.payload);
    case 'UPDATE_AUFGABE':         return updateAufgabe(state, action.dokId, action.payload);
    case 'DELETE_AUFGABE':         return deleteAufgabe(state, action.dokId, action.aufgabeId);
    case 'UPDATE_ETIKETTEN':       return updateEtiketten(state, action.id, action.etiketten);
    case 'RESET_DEMO':             return resetDemo(state);
    default:                       return null;
  }
}

/* -------------------------------------------------------------------------- */
/* CASE HANDLERS — Tek sorumluluklu, test edilebilir kucuk fonksiyonlar       */
/* -------------------------------------------------------------------------- */

function addDokument(state: StoreState, dok: Dokument): StoreState {
  // Duplicate detection: ayni rohText prefix'i (~120 karakter) varsa
  // belge eklenmez; flag set edilir ki UI uyari gosterebilsin.
  if (dok.rohText) {
    const sig = dok.rohText.slice(0, 120);
    const dup = state.dokumente.some(d => d.rohText && d.rohText.slice(0, 120) === sig);
    if (dup) return { ...state, _duplikat: true };
  }
  return { ...state, dokumente: [dok, ...state.dokumente], _duplikat: false };
}

function updateDokument(state: StoreState, payload: Partial<Dokument> & { id: string }): StoreState {
  return {
    ...state,
    dokumente: state.dokumente.map(d => {
      if (d.id !== payload.id) return d;

      // Hangi takip-edilen alanlar degisti?
      const geaendert = VERFOLGTE_FELDER.filter(
        f => payload[f] !== undefined && payload[f] !== d[f],
      );
      const rohTextGeaendert = payload.rohText !== undefined && payload.rohText !== d.rohText;

      // Hicbir versiyonlanir alan degismediyse versiyonlamayi atla.
      if (geaendert.length === 0 && !rohTextGeaendert) {
        const quick = { ...d, ...payload };
        const k = followKurzfassungMitKernfeldern(d, quick, payload);
        return k ? { ...quick, ...k } : quick;
      }

      // Snapshot olustur — sadece degisen alanlari sakla.
      const snapshot: Record<string, unknown> = {};
      geaendert.forEach(f => { snapshot[f] = d[f]; });
      if (rohTextGeaendert && d.rohText) snapshot._altRohText = d.rohText;

      const versionen: DokumentVersion[] = [
        {
          datum: new Date().toISOString(),
          felder: snapshot,
          altRohText: rohTextGeaendert ? d.rohText ?? undefined : undefined,
        },
        ...(d.versionen || []),
      ].slice(0, 10); // En son 10 versiyon tutulur (memory cap)

      const mergedBase = { ...d, ...payload, versionen };
      const k = followKurzfassungMitKernfeldern(d, mergedBase, payload);
      return k ? { ...mergedBase, ...k } : mergedBase;
    }),
  };
}

function deleteDokument(state: StoreState, id: string): StoreState {
  return { ...state, dokumente: state.dokumente.filter(d => d.id !== id) };
}

function markFlag(
  state: StoreState,
  id: string,
  flag: 'gelesen' | 'erledigt',
  value: boolean,
): StoreState {
  return {
    ...state,
    dokumente: state.dokumente.map(d => (d.id === id ? { ...d, [flag]: value } : d)),
  };
}

function toggleFavorit(state: StoreState, id: string): StoreState {
  return {
    ...state,
    dokumente: state.dokumente.map(d => (d.id === id ? { ...d, favorit: !d.favorit } : d)),
  };
}

function setSichtbarBis(state: StoreState, id: string, sichtbarBis: string | null): StoreState {
  return {
    ...state,
    dokumente: state.dokumente.map(d => (d.id === id ? { ...d, sichtbarBis } : d)),
  };
}

function applyActionOutcome(
  state: StoreState,
  id: string,
  outcome: ActionHistoryEntry & {
    color?: string;
    hideFromTasks?: boolean;
    archiveBehavior?: string | null;
  },
): StoreState {
  return {
    ...state,
    dokumente: state.dokumente.map(d => {
      if (d.id !== id) return d;
      const createdAt = outcome.createdAt || new Date().toISOString();
      const nextEntry: ActionHistoryEntry = {
        status: outcome.status,
        stamp: outcome.stamp,
        label: outcome.label,
        timeline: outcome.timeline,
        createdAt,
      };
      return {
        ...d,
        workflowStatus: outcome.status,
        workflowStamp: outcome.stamp,
        workflowColor: outcome.color,
        workflowTimeline: outcome.timeline,
        workflowUpdatedAt: createdAt,
        hideFromTasks: outcome.hideFromTasks ?? d.hideFromTasks ?? false,
        archiveBehavior: outcome.archiveBehavior ?? d.archiveBehavior ?? null,
        // En son 12 outcome'i tut — UI timeline'inda gostermek icin
        actionHistory: [nextEntry, ...(d.actionHistory || [])].slice(0, 12),
      };
    }),
  };
}

function setDokProfil(state: StoreState, id: string, profilId: string | null): StoreState {
  return {
    ...state,
    dokumente: state.dokumente.map(d => (d.id === id ? { ...d, profilId } : d)),
  };
}

/* ------------------------------- Aufgabe ------------------------------- */

function addAufgabe(state: StoreState, dokId: string, payload: import('@/store/types').Aufgabe): StoreState {
  const target = state.dokumente.find(d => d.id === dokId);
  if (!target) return state;
  const aufgaben = [...(target.aufgaben || []), payload];
  return {
    ...state,
    dokumente: state.dokumente.map(d => (d.id === dokId ? { ...d, aufgaben } : d)),
  };
}

function updateAufgabe(
  state: StoreState,
  dokId: string,
  payload: Partial<import('@/store/types').Aufgabe> & { id: string },
): StoreState {
  return {
    ...state,
    dokumente: state.dokumente.map(d => {
      if (d.id !== dokId) return d;
      const aufgaben = (d.aufgaben || []).map(a => (a.id === payload.id ? { ...a, ...payload } : a));
      return { ...d, aufgaben };
    }),
  };
}

function deleteAufgabe(state: StoreState, dokId: string, aufgabeId: string): StoreState {
  return {
    ...state,
    dokumente: state.dokumente.map(d => {
      if (d.id !== dokId) return d;
      return { ...d, aufgaben: (d.aufgaben || []).filter(a => a.id !== aufgabeId) };
    }),
  };
}

/* -------------------------------- Demo --------------------------------- */
function resetDemo(state: StoreState): StoreState {
  const fresh = createDemoDokumente();
  const nonDemo = state.dokumente.filter(d => !d.isDemo);
  return { ...state, dokumente: [...fresh, ...nonDemo] };
}

/* ------------------------------ Etiketten ------------------------------ */
/** UPDATE_ETIKETTEN hem dokumana hem etikettenVerlauf'a yazar.
 *  Bu kararli sayilir cunku verlauf rolu autocomplete kaynagi gibidir. */
function updateEtiketten(state: StoreState, id: string, etiketten: string[]): StoreState {
  const docs = state.dokumente.map(d => (d.id === id ? { ...d, etiketten } : d));
  const alle = etiketten || [];
  // Yeni etiketleri en basa al, mevcutlari koru, en fazla 20 tut.
  const verlauf = [...new Set([...alle, ...(state.einstellungen.etikettenVerlauf || [])])].slice(0, 20);
  return {
    ...state,
    dokumente: docs,
    einstellungen: { ...state.einstellungen, etikettenVerlauf: verlauf },
  };
}
