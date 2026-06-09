/**
 * Barrel — eski `import { ... } from '@/store'` kullanimlari icin
 * geriye uyumluluk saglar.
 *
 * Yeni kod yazildiginda dogrudan alt dosyalardan import edilebilir
 * (orn. `import type { Dokument } from 'src/store/types'`), ama eski
 * kod kirilmasin diye bu barrel butun public API'yi yeniden export eder.
 */
export type {
  Aufgabe,
  DokumentVersion,
  ActionHistoryEntry,
  ScannedPage,
  Dokument,
  FilterKombi,
  KlassorRegel,
  LernRegel,
  Profil,
  Kisayol,
  AktiveSablon,
  BudgetTarget,
  Einstellungen,
  StoreState,
} from './types';

export type { StoreAction } from './actions';

export { StoreProvider, useStore } from './Provider';
