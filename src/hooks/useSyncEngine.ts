import { useState, useCallback, useRef } from 'react';
import { deltaSync, getHealthStatus } from '../services/v4Api';
import { queueVerarbeiten } from '../services/offlineQueue';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export function useSyncEngine() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

  const sync = useCallback(async (dispatch: any, since?: string | null): Promise<string | null> => {
    if (runningRef.current) return null;
    runningRef.current = true;
    setStatus('syncing');
    setError(null);
    try {
      await getHealthStatus();
      await deltaSync(since ?? new Date(0).toISOString());
      await queueVerarbeiten(dispatch);
      const now = new Date().toISOString();
      setLastSync(now);
      setStatus('success');
      return now;
    } catch (e: any) {
      setError(e?.message ?? 'Sync fehlgeschlagen');
      setStatus('error');
      return null;
    } finally {
      runningRef.current = false;
    }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      return await getHealthStatus();
    } catch {
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { status, lastSync, error, sync, checkHealth, reset };
}
