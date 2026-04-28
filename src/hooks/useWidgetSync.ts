import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useStore } from '../store';
import { syncWidgetData } from '../services/WidgetDataService';

// Syncs document data to the native widget whenever:
//   - The store changes (debounced to avoid thrashing)
//   - The app returns to foreground (widget data may be stale)

const DEBOUNCE_MS = 1500;

export function useWidgetSync() {
  const { state } = useStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncRef = useRef<number>(0);

  function sync() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await syncWidgetData(state.dokumente);
      lastSyncRef.current = Date.now();
    }, DEBOUNCE_MS);
  }

  // Sync on store changes
  useEffect(() => { sync(); }, [state.dokumente]);

  // Sync when app comes to foreground (widget may have been stale)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        const staleSince = Date.now() - lastSyncRef.current;
        if (staleSince > 60_000) sync();  // only if > 1 min since last sync
      }
    });
    return () => sub.remove();
  }, [state.dokumente]);

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
}
