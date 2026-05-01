import { useCallback, useEffect, useReducer } from 'react';
import { getLangSync, subscribeLang } from '@/i18n/langStore';
import { t } from '@/i18n/translations';

/**
 * Translation hook — does NOT depend on React Context.
 * Uses module-level lang store: any setLangGlobal() call
 * causes ALL useT() consumers to re-render immediately.
 */
export function useT() {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const unsub = subscribeLang(forceUpdate);
    return unsub;
  }, []);

  const lang = getLangSync();

  const translate = useCallback(
    (key: string, vars?: Record<string, string | number>) => t(lang, key, vars),
    [lang],
  );

  return { t: translate, lang };
}
