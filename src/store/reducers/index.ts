/**
 * Root reducer — alt reducer'lara delegasyon yapar.
 *
 * Sirayla document, settings reducer'larini dener. Hicbiri eslesmezse
 * ortak/cross-cutting aksiyonlari (LOAD, CLEAR_DUPLIKAT) burada
 * cozer ve degismeyen state'i geri verir.
 *
 * Bu yontem: yeni bir domain reducer'i eklemek hic kod degistirmeden
 * sadece bu zincire eklemekle yapilir. Test edilebilirlik artar:
 * her reducer izole edilmis halde test edilir.
 */
import type { StoreState } from '@/store/types';
import type { StoreAction } from '@/store/actions';
import { documentReducer } from '@/store/reducers/documents';
import { settingsReducer } from '@/store/reducers/settings';

export function rootReducer(state: StoreState, action: StoreAction): StoreState {
  // 1) LOAD — tum state'i hidrate eder; AsyncStorage hydration sirasinda
  //    cagrilir. Tek seferlik bir aksiyondur.
  if (action.type === 'LOAD') {
    const payload = action.payload;
    // Strip demo docs that may have been persisted from earlier app versions.
    // Also strip by ID prefix for docs persisted before isDemo flag was added.
    const dokumente = payload.dokumente
      ? payload.dokumente.filter(d => !d.isDemo && !d.id?.startsWith('demo-'))
      : state.dokumente;
    return { ...state, ...payload, dokumente };
  }

  // 2) CLEAR_DUPLIKAT — uyari banner'ini kapatir.
  if (action.type === 'CLEAR_DUPLIKAT') {
    return { ...state, _duplikat: false };
  }

  // 3) Domain reducer'lara dene — null donen ilk reducer aksiyona
  //    ait degil demektir, bir sonrakine gec.
  const fromDocs = documentReducer(state, action);
  if (fromDocs) return fromDocs;

  const fromSettings = settingsReducer(state, action);
  if (fromSettings) return fromSettings;

  // Hic eslesme yoksa state degismez.
  return state;
}
