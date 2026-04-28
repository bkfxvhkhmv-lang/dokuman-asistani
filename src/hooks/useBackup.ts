import { useState, useCallback } from 'react';
import {
  exportYedek,
  importYedek,
  autoYedekSpeichern,
  letzteAutoYedekTarih,
  autoYedekWiederherstellen,
} from '../services/backup';

export function useBackup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAutoDate, setLastAutoDate] = useState<string | null>(null);

  const exportBackup = useCallback(async (state: any): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await exportYedek(state);
      return true;
    } catch (e: any) {
      setError(e?.message ?? 'Export fehlgeschlagen');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const importBackup = useCallback(async (dispatch: any): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await importYedek(dispatch);
      return true;
    } catch (e: any) {
      setError(e?.message ?? 'Import fehlgeschlagen');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const autoSave = useCallback(async (state: any): Promise<void> => {
    try {
      await autoYedekSpeichern(state);
    } catch { /* silent — auto-save should not surface errors */ }
  }, []);

  const autoRestore = useCallback(async (dispatch: any): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await autoYedekWiederherstellen(dispatch);
      return true;
    } catch (e: any) {
      setError(e?.message ?? 'Wiederherstellung fehlgeschlagen');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getLastAutoDate = useCallback(async (): Promise<string | null> => {
    const date = await letzteAutoYedekTarih();
    setLastAutoDate(date);
    return date;
  }, []);

  return { loading, error, lastAutoDate, exportBackup, importBackup, autoSave, autoRestore, getLastAutoDate };
}
