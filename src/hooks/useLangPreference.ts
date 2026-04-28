import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LANG } from '../i18n/langConfig';

export const LANG_KEY = '@briefpilot_lang';

export async function getLang(): Promise<string> {
  const val = await AsyncStorage.getItem(LANG_KEY);
  return val ?? DEFAULT_LANG;
}

export async function setLang(code: string): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, code);
}

export function useLangPreference() {
  const [lang, setLangState] = useState<string>(DEFAULT_LANG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getLang()
      .then(l => setLangState(l))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const changeLang = useCallback(async (code: string) => {
    await setLang(code);
    setLangState(code);
  }, []);

  return { lang, changeLang, loaded };
}
