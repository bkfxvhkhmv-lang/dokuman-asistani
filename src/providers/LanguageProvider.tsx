/**
 * LanguageProvider — initializes the lang store from AsyncStorage on app start.
 * Does NOT use React Context. All language state lives in langStore.ts.
 */
import React, { useEffect } from 'react';
import { initLang } from '@/i18n/langStore';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initLang(); // read persisted lang from AsyncStorage once
  }, []);
  return <>{children}</>;
}

/** Kept for legacy imports — no longer needed but won't break */
export function useLang() {
  return { lang: 'de', changeLang: async () => {}, loaded: true };
}
