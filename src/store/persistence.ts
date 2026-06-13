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
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import type { StoreState } from '@/store/types';
import { STORE_KEY } from '@/store/initialState';

const PERSIST_DEBOUNCE_MS = 1500;

/**
 * Extracts the path relative to documentDirectory from an absolute sandbox URI.
 * Works even if the UUID in the path has changed since the URI was stored.
 * e.g. "file:///.../<UUID>/Documents/scans/abc/page-1.jpg" → "scans/abc/page-1.jpg"
 */
function extractRelativePath(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const match = uri.match(/\/Documents\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Rehydrates file URIs in a single document from stored relativePath fields.
 * Also migrates old absolute-path documents to relativePath on first load.
 */
function rehydrateDocumentFiles(dok: any): any {
  const docDir = FileSystem.documentDirectory ?? '';

  // Rehydrate pages
  if (Array.isArray(dok.pages)) {
    dok.pages = dok.pages.map((p: any) => {
      if (p.relativePath) {
        return { ...p, uri: docDir + p.relativePath };
      }
      // Migration: old absolute path — extract relativePath and rehydrate
      const rel = extractRelativePath(p.uri);
      if (rel) {
        return { ...p, uri: docDir + rel, relativePath: rel };
      }
      return p;
    });
  }

  // Rehydrate dok.uri from fileRelativePath
  if (dok.fileRelativePath) {
    return { ...dok, uri: docDir + dok.fileRelativePath };
  }
  // Migration: if dok.uri is an old absolute path pointing to scans/
  if (dok.uri && !dok.fileRelativePath) {
    const rel = extractRelativePath(dok.uri);
    if (rel) {
      return { ...dok, uri: docDir + rel, fileRelativePath: rel };
    }
  }
  return dok;
}

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
      const cleaned = parsed.dokumente
        .filter((d: any) => !d.isDemo && !d.id?.startsWith('demo-'))
        .map(rehydrateDocumentFiles);
      parsed.dokumente = cleaned;
      // Write back only if demo docs were stripped (to persist migration)
      const hadDemoItems = cleaned.length !== parsed.dokumente.length;
      if (hadDemoItems) {
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
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hydratedRef.current) return;

    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }

    persistTimerRef.current = setTimeout(() => {
      // _duplikat calisma zamani UI flag'i — kalici degil.
      const { _duplikat: _omit, ...save } = state;
      AsyncStorage.setItem(STORE_KEY, JSON.stringify(save)).catch(e =>
        console.warn('[Store] persistence write error', e),
      );
      persistTimerRef.current = null;
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [state, hydratedRef]);
}
