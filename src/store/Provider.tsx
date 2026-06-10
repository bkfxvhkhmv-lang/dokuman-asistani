/**
 * StoreProvider + useStore hook.
 *
 * Tek sorumluluk: React Context'i kurmak ve persistence yasam donusunu
 * yonetmek (mount'ta yukle, state degistiginde yaz). Reducer ve
 * persistence implementasyon detaylari ayri dosyalarda.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
} from 'react';
import type { StoreState } from '@/store/types';
import type { StoreAction } from '@/store/actions';
import { rootReducer } from '@/store/reducers';
import { INITIAL_STATE } from '@/store/initialState';
import { loadPersistedState, usePersistOnChange } from '@/store/persistence';
import { useAuth } from '@/providers/AuthContext';

interface StoreContextValue {
  state: StoreState;
  dispatch: Dispatch<StoreAction>;
  /** true once loadPersistedState() has resolved and LOAD has been dispatched. */
  storeHydrated: boolean;
}

const Ctx = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(rootReducer, INITIAL_STATE);
  const hydratedRef = useRef(false);
  const [storeHydrated, setStoreHydrated] = useState(false);

  // 1) Acilista persisted state'i hydrate et.
  useEffect(() => {
    let cancelled = false;
    loadPersistedState()
      .then(payload => {
        if (cancelled) return;
        if (payload) dispatch({ type: 'LOAD', payload });
      })
      .finally(() => {
        if (!cancelled) {
          hydratedRef.current = true;
          setStoreHydrated(true);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // 2) State her degistiginde diske kaydet (hydration sonrasi).
  usePersistOnChange(state, hydratedRef);

  // 3) Guest → real user transition: clear stale appSperre so new real user is not locked out.
  const { user } = useAuth();
  const prevUserRef = useRef(user);
  useEffect(() => {
    if (storeHydrated) {
      const wasGuest = prevUserRef.current?.isGuest === true;
      const isReal = user != null && user.isGuest !== true;
      if (wasGuest && isReal) {
        dispatch({ type: 'UPDATE_EINSTELLUNGEN', payload: { appSperre: false } });
      }
    }
    prevUserRef.current = user;
  }, [user, storeHydrated, dispatch]);

  return <Ctx.Provider value={{ state, dispatch, storeHydrated }}>{children}</Ctx.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
