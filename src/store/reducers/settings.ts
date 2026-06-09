/**
 * Einstellungen reducer'i — yalnizca `state.einstellungen` dilimini
 * degistiren aksiyonlari ele alir.
 *
 * Sorumluluklar:
 *  - Filter kombinasyonlari (kayitli aramalar)
 *  - Klassor kurallari (otomatik klasorleme)
 *  - Lern kurallari (akilli ogrenme)
 *  - Profile (cok kullanicili profil yonetimi)
 *  - Kisayollar
 *  - Sablonlar (yanit sablonlari)
 *  - Genel UPDATE_EINSTELLUNGEN merge
 */
import type { StoreAction } from '@/store/actions';
import type {
  StoreState,
  FilterKombi,
  KlassorRegel,
  LernRegel,
  Profil,
  Kisayol,
  AktiveSablon,
} from '@/store/types';

/** Settings-touching aksiyonlari uygular. Aksiyon bu dosyaya ait
 *  degilse `null` doner; root reducer baska bir reducer'a yonlendirir. */
export function settingsReducer(state: StoreState, action: StoreAction): StoreState | null {
  switch (action.type) {
    case 'UPDATE_EINSTELLUNGEN':
      return mergeSettings(state, action.payload);

    case 'SAVE_FILTER_KOMBI':
      return saveFilterKombi(state, action.payload);

    case 'DELETE_FILTER_KOMBI':
      return deleteFilterKombi(state, action.id);

    case 'ADD_KLASSOR_REGEL':
      return addKlassorRegel(state, action.payload);

    case 'DELETE_KLASSOR_REGEL':
      return deleteKlassorRegel(state, action.absenderPattern);

    case 'ADD_LERN_REGEL':
      return addLernRegel(state, action.payload);

    case 'DELETE_LERN_REGEL':
      return deleteLernRegel(state, action.id);

    case 'INCREMENT_LERN_ANWENDUNG':
      return incrementLernAnwendung(state, action.id);

    case 'ADD_PROFIL':
      return addProfil(state, action.payload);

    case 'DELETE_PROFIL':
      return deleteProfil(state, action.id);

    case 'SET_AKTIF_PROFIL':
      return setAktifProfil(state, action.id);

    case 'ADD_KISAYOL':
      return addKisayol(state, action.payload);

    case 'DELETE_KISAYOL':
      return deleteKisayol(state, action.id);

    case 'ADD_SABLON':
      return addSablon(state, action.payload);

    case 'REMOVE_SABLON':
      return removeSablon(state, action.dokId, action.sablonId);

    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */

function mergeSettings(state: StoreState, patch: Partial<StoreState['einstellungen']>): StoreState {
  return { ...state, einstellungen: { ...state.einstellungen, ...patch } };
}

/* ------------------------------ Filter Kombi ----------------------------- */

function saveFilterKombi(state: StoreState, payload: Omit<FilterKombi, 'id'>): StoreState {
  const kombis = [...(state.einstellungen.filterKombis || [])];
  // ID base36 timestamp — collision riski yok (ayni ms icinde 2 kayit olmaz).
  kombis.push({ id: Date.now().toString(36), ...payload });
  return mergeSettings(state, { filterKombis: kombis });
}

function deleteFilterKombi(state: StoreState, id: string): StoreState {
  const kombis = (state.einstellungen.filterKombis || []).filter(k => k.id !== id);
  return mergeSettings(state, { filterKombis: kombis });
}

/* ----------------------------- Klassor Regel ----------------------------- */

function addKlassorRegel(state: StoreState, payload: KlassorRegel): StoreState {
  const regeln = [...(state.einstellungen.klassorRegeln || [])];
  // Ayni absender icin ikinci kural ekleme — gereksiz duplicate.
  const exists = regeln.some(r => r.absenderPattern === payload.absenderPattern);
  if (!exists) regeln.push(payload);
  return mergeSettings(state, { klassorRegeln: regeln });
}

function deleteKlassorRegel(state: StoreState, absenderPattern: string): StoreState {
  const regeln = (state.einstellungen.klassorRegeln || []).filter(r => r.absenderPattern !== absenderPattern);
  return mergeSettings(state, { klassorRegeln: regeln });
}

/* ------------------------------ Lern Regel ------------------------------- */

function addLernRegel(state: StoreState, payload: LernRegel): StoreState {
  const regeln = [...(state.einstellungen.lernRegeln || [])];
  // Ayni patternin ayni felder snapshot'iyla iki kez eklenmesini engelle.
  const exists = regeln.some(
    r =>
      r.absenderPattern === payload.absenderPattern &&
      JSON.stringify(r.felder) === JSON.stringify(payload.felder),
  );
  if (exists) return state;
  regeln.push(payload);
  return mergeSettings(state, { lernRegeln: regeln });
}

function deleteLernRegel(state: StoreState, id: string): StoreState {
  const regeln = (state.einstellungen.lernRegeln || []).filter(r => r.id !== id);
  return mergeSettings(state, { lernRegeln: regeln });
}

function incrementLernAnwendung(state: StoreState, id: string): StoreState {
  const regeln = (state.einstellungen.lernRegeln || []).map(r =>
    r.id === id ? { ...r, anwendungen: (r.anwendungen || 0) + 1 } : r,
  );
  return mergeSettings(state, { lernRegeln: regeln });
}

/* -------------------------------- Profil --------------------------------- */

function addProfil(state: StoreState, payload: Profil): StoreState {
  const profile = [...(state.einstellungen.profile || []), payload];
  return mergeSettings(state, { profile });
}

function deleteProfil(state: StoreState, id: string): StoreState {
  const profile = (state.einstellungen.profile || []).filter(p => p.id !== id);
  // Aktif profil silinirse aktifProfilId'yi sifirla.
  const aktifProfilId =
    state.einstellungen.aktifProfilId === id ? null : state.einstellungen.aktifProfilId;
  return mergeSettings(state, { profile, aktifProfilId });
}

function setAktifProfil(state: StoreState, id: string | null): StoreState {
  return mergeSettings(state, { aktifProfilId: id });
}

/* ------------------------------- Kisayol --------------------------------- */

function addKisayol(state: StoreState, payload: Kisayol): StoreState {
  const kisayollar = [...(state.einstellungen.kisayollar || []), payload];
  return mergeSettings(state, { kisayollar });
}

function deleteKisayol(state: StoreState, id: string): StoreState {
  const kisayollar = (state.einstellungen.kisayollar || []).filter(k => k.id !== id);
  return mergeSettings(state, { kisayollar });
}

/* -------------------------------- Sablon --------------------------------- */

function addSablon(state: StoreState, payload: AktiveSablon): StoreState {
  const sablonlar = [...(state.einstellungen.aktiveSablonlari || [])];
  // Ayni dok+sablon ikilisi varsa replace et — uniqueness guarantee.
  const idx = sablonlar.findIndex(
    s => s.dokId === payload.dokId && s.sablonId === payload.sablonId,
  );
  if (idx >= 0) sablonlar[idx] = payload;
  else sablonlar.push(payload);
  return mergeSettings(state, { aktiveSablonlari: sablonlar });
}

function removeSablon(state: StoreState, dokId: string, sablonId: string): StoreState {
  const sablonlar = (state.einstellungen.aktiveSablonlari || []).filter(
    s => !(s.dokId === dokId && s.sablonId === sablonId),
  );
  return mergeSettings(state, { aktiveSablonlari: sablonlar });
}
