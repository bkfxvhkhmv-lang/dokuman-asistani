import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGES, DEFAULT_LANG, type LangOption } from './langConfig';

// Tercüme dosyalarını import et
import de from './translations/de.json';
import tr from './translations/tr.json';
import en from './translations/en.json';
import ar from './translations/ar.json';
import uk from './translations/uk.json';
import ru from './translations/ru.json';
import fr from './translations/fr.json';

type Translation = typeof de;

const TRANSLATIONS: Record<string, Translation> = {
  de, tr, en, ar, uk, ru, fr,
};

const LANG_STORAGE_KEY = '@briefpilot_ui_lang';

interface I18nContextType {
  lang: string;
  langName: string;
  flag: string;
  changeLang: (code: string) => Promise<void>;
  t: (key: string, defaults?: string) => string;
  allLanguages: LangOption[];
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<string>(DEFAULT_LANG);
  const [isLoading, setIsLoading] = useState(true);

  // Tercümeleri derinlemesine alır (ör: "common.ok" → "OK")
  const t = useCallback((key: string, defaults?: string): string => {
    const translation = TRANSLATIONS[lang];
    if (!translation) return defaults ?? key;

    const keys = key.split('.');
    let value: any = translation;

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }

    return typeof value === 'string' ? value : (defaults ?? key);
  }, [lang]);

  // Dili başlat — AsyncStorage'dan oku
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANG_STORAGE_KEY);
        if (saved && TRANSLATIONS[saved]) {
          setLang(saved);
        }
      } catch (e) {
        console.warn('[I18n] Failed to load language preference:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Dili değiştir ve kaydet
  const changeLang = useCallback(async (code: string) => {
    if (!TRANSLATIONS[code]) {
      console.warn(`[I18n] Language "${code}" not found`);
      return;
    }
    try {
      await AsyncStorage.setItem(LANG_STORAGE_KEY, code);
      setLang(code);
    } catch (e) {
      console.error('[I18n] Failed to save language:', e);
      throw e;
    }
  }, []);

  const langOption = LANGUAGES.find(l => l.code === lang);
  const langName = langOption?.name ?? DEFAULT_LANG;
  const flag = langOption?.flag ?? '🌍';

  const value: I18nContextType = {
    lang,
    langName,
    flag,
    changeLang,
    t,
    allLanguages: LANGUAGES,
    isLoading,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook — tercümeleri ve dil seçimini kullan
 * 
 * @example
 * const { t, lang, changeLang } = useI18n();
 * <Text>{t('common.ok')}</Text>
 * <Button onPress={() => changeLang('en')} />
 */
export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
