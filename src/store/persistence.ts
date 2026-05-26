/**
 * AsyncStorage tabanli store persistence yardimcilari.
 *
 * Provider tarafindan iki kanca olarak kullanilir:
 *  - `loadPersistedState()` — uygulama acilisinda tek seferlik
 *    AsyncStorage'tan oku ve LOAD aksiyonu ile dispatch et.
 *  - `usePersistOnChange(state, hydratedRef)` — state her degistiginde
 *    debounce'siz olarak diske yaz; ama hydration tamamlanmadan once
 *    yazma (yoksa asynchronously demo data, persisted user data'yi
 *    ezerdi).
 *
 * Boylece persistence katmani Provider'dan ayri test edilebilir.
 */
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StoreState } from '@/store/types';
import { STORE_KEY } from '@/store/initialState';

/** AsyncStorage'tan persist edilen state'i parse ederek dondurur.
 *  Hata olursa null doner; uygulamayi crash etmez.
 *  Demo belgeler read-time'da filtrelenir ve AsyncStorage'a geri yazilir
 *  (usePersistOnChange timing guvencesi olmadan garantili temizlik). */
export async function loadPersistedState(): Promise<Partial<StoreState> | null> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoreState>;

    if (parsed.dokumente) {
      const cleaned = parsed.dokumente.filter(
        d => !d.isDemo && !d.id?.startsWith('demo-'),
      );
      if (cleaned.length !== parsed.dokumente.length) {
        parsed.dokumente = cleaned;
        const { _duplikat: _omit, ...toSave } = { ...parsed };
        AsyncStorage.setItem(STORE_KEY, JSON.stringify(toSave)).catch(e =>
          console.warn('[Store] demo-cleanup write error', e),
        );
      }
    }

    return parsed;
  } catch (e) {
    console.warn('[Store] persistence read error', e);
    return null;
  }
}

/** State her degistiginde diske yaz. `_duplikat` calisma zamani
 *  bayragidir — diske yazilmaz. */
export function usePersistOnChange(
  state: StoreState,
  hydratedRef: { readonly current: boolean },
): void {
  useEffect(() => {
    if (!hydratedRef.current) return;
    // _duplikat calisma zamani UI flag'i — kalici degil.
    const { _duplikat: _omit, ...save } = state;
    AsyncStorage.setItem(STORE_KEY, JSON.stringify(save)).catch(e =>
      console.warn('[Store] persistence write error', e),
    );
  }, [state, hydratedRef]);
}
