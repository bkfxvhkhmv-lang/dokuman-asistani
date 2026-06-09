import { useCallback, useEffect, useReducer } from 'react';
import { getLangSync, setLangGlobal, subscribeLang, DEFAULT_LANG } from '@/i18n/langStore';

export { LANG_KEY, DEFAULT_LANG } from '@/i18n/langStore';

/** One-shot async read (for non-component code) */
export async function getLang(): Promise<string> {
  return getLangSync();
}

/** One-shot async write (for non-component code) */
export async function setLang(code: string): Promise<void> {
  setLangGlobal(code);
}

/** Hook — same API as before, now backed by module-level store */
export function useLangPreference() {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const unsub = subscribeLang(forceUpdate);
    return unsub;
  }, []);

  const changeLang = useCallback((code: string) => {
    setLangGlobal(code);
    return Promise.resolve();
  }, []);

  return { lang: getLangSync(), changeLang, loaded: true };
}
