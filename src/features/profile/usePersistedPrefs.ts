/**
 * Profil ayarlarinin AsyncStorage persisted state'i.
 *
 * Push, weekly summary, auto backup ve partner email
 * tek yerden yuklenir; kayit setter'lari otomatik AsyncStorage'a yazar.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREF_KEYS = {
  push:         '@briefpilot_pref_push',
  weekly:       '@briefpilot_pref_weekly',
  autoBackup:   '@briefpilot_pref_autobackup',
  partnerEmail: '@briefpilot_pref_partner_email',
  autoAnalyse:  '@briefpilot_pref_auto_analyse',
} as const;

export interface UsePersistedPrefsResult {
  pushEnabled:   boolean; setPushEnabled:   (v: boolean) => void;
  weeklySummary: boolean; setWeeklySummary: (v: boolean) => void;
  autoBackup:    boolean; setAutoBackup:    (v: boolean) => void;
  partnerEmail:  string;  setPartnerEmail:  (v: string)  => void;
  /** Server-/KI-Analyse bei neuen Dokumenten (V1: Präferenz, Pipeline kann später lesen) */
  autoAnalyse:   boolean; setAutoAnalyse:   (v: boolean) => void;
}

export function usePersistedPrefs(): UsePersistedPrefsResult {
  const [pushEnabled,   setPushEnabledRaw]   = useState(true);
  const [weeklySummary, setWeeklySummaryRaw] = useState(false);
  const [autoBackup,    setAutoBackupRaw]    = useState(true);
  const [partnerEmail,  setPartnerEmailRaw]  = useState('');
  const [autoAnalyse, setAutoAnalyseRaw] = useState(true);

  // Tek yerden yukle (multiGet).
  useEffect(() => {
    AsyncStorage.multiGet([
      PREF_KEYS.push, PREF_KEYS.weekly, PREF_KEYS.autoBackup, PREF_KEYS.partnerEmail, PREF_KEYS.autoAnalyse,
    ])
      .then(pairs => {
        const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
        if (map[PREF_KEYS.push]       !== null) setPushEnabledRaw(map[PREF_KEYS.push] !== 'false');
        if (map[PREF_KEYS.weekly]     !== null) setWeeklySummaryRaw(map[PREF_KEYS.weekly] === 'true');
        if (map[PREF_KEYS.autoBackup] !== null) setAutoBackupRaw(map[PREF_KEYS.autoBackup] !== 'false');
        if (map[PREF_KEYS.partnerEmail])        setPartnerEmailRaw(map[PREF_KEYS.partnerEmail] ?? '');
        if (map[PREF_KEYS.autoAnalyse] !== undefined && map[PREF_KEYS.autoAnalyse] !== null)
          setAutoAnalyseRaw(map[PREF_KEYS.autoAnalyse] !== 'false');
      })
      .catch(e => console.warn('[Profile] load prefs error', e));
  }, []);

  const savePref = (key: string, value: boolean | string) =>
    AsyncStorage.setItem(key, String(value)).catch(e => console.warn('[Profile] savePref error', e));

  const setPushEnabled = useCallback((v: boolean) => {
    setPushEnabledRaw(v);
    savePref(PREF_KEYS.push, v);
  }, []);

  const setWeeklySummary = useCallback((v: boolean) => {
    setWeeklySummaryRaw(v);
    savePref(PREF_KEYS.weekly, v);
  }, []);

  const setAutoBackup = useCallback((v: boolean) => {
    setAutoBackupRaw(v);
    savePref(PREF_KEYS.autoBackup, v);
  }, []);

  const setPartnerEmail = useCallback((v: string) => {
    setPartnerEmailRaw(v);
    savePref(PREF_KEYS.partnerEmail, v);
  }, []);

  const setAutoAnalyse = useCallback((v: boolean) => {
    setAutoAnalyseRaw(v);
    savePref(PREF_KEYS.autoAnalyse, v);
  }, []);

  return {
    pushEnabled,   setPushEnabled,
    weeklySummary, setWeeklySummary,
    autoBackup,    setAutoBackup,
    partnerEmail,  setPartnerEmail,
    autoAnalyse,   setAutoAnalyse,
  };
}
