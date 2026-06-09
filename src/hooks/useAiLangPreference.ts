import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_AI_LANG } from '@/i18n/aiLangConfig';

export const AI_LANG_KEY = '@briefpilot_ai_lang';

export async function getAiLang(): Promise<string> {
  const val = await AsyncStorage.getItem(AI_LANG_KEY);
  return val ?? DEFAULT_AI_LANG;
}

export async function setAiLang(code: string): Promise<void> {
  await AsyncStorage.setItem(AI_LANG_KEY, code);
}

export function useAiLangPreference() {
  const [aiLang, setAiLangState] = useState<string>(DEFAULT_AI_LANG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getAiLang()
      .then(l => setAiLangState(l))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const changeAiLang = useCallback(async (code: string) => {
    await setAiLang(code);
    setAiLangState(code);
  }, []);

  return { aiLang, changeAiLang, loaded };
}
