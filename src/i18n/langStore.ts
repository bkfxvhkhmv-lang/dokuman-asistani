/**
 * Module-level language store — no React Context needed.
 * Works regardless of component tree position or provider order.
 *
 * When setLang() is called, every subscribed component re-renders instantly.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LANG_KEY = '@briefpilot_lang';
export const DEFAULT_LANG = 'de';

// Module-level — one instance, always the same reference
let _currentLang: string = DEFAULT_LANG;
const _listeners = new Set<() => void>();

/** Read current lang synchronously (safe to call anywhere) */
export function getLangSync(): string {
  return _currentLang;
}

/** Change language: updates module var, notifies all components, persists */
export function setLangGlobal(code: string): void {
  if (_currentLang === code) return;
  _currentLang = code;
  _listeners.forEach(fn => fn());
  AsyncStorage.setItem(LANG_KEY, code).catch(() => {});
}

/** Subscribe to language changes — returns unsubscribe fn */
export function subscribeLang(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/** Initialize from AsyncStorage once on app start */
export async function initLang(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LANG_KEY);
    if (stored && stored !== _currentLang) {
      _currentLang = stored;
      _listeners.forEach(fn => fn());
    }
  } catch {}
}
