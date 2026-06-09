import { useCallback } from 'react';
import { useLangPreference } from '@/hooks/useLangPreference';
import { scanT } from '@/i18n/scanStrings';

export function useScanI18n() {
  const { lang } = useLangPreference();
  const t = useCallback((key: string, vars?: Record<string, string>) => scanT(lang, key, vars), [lang]);
  return { t, lang };
}
