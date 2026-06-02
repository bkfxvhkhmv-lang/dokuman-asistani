import { useEffect } from 'react';
import { API_BASE } from '@/config';

async function pingOnce(): Promise<boolean> {
  // API_BASE is e.g. http://host:8000/api/v4 — health lives at http://host:8000/health/
  const origin = (() => { try { return new URL(API_BASE).origin; } catch { return API_BASE; } })();
  const url = `${origin}/health/`;
  try {
    const r = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    return r.ok;
  } catch {
    return false;
  }
}

/** Uygulama açılışında kısa API health kontrolü (sessiz — yalnızca dev uyarısı). */
export default function BackendHealthBootstrap() {
  useEffect(() => {
    void pingOnce().then(ok => {
      if (__DEV__ && !ok) {
        console.warn('[BackendHealth] Reachability check failed for', `${origin}/health/`);
      }
    });
    return undefined;
  }, []);
  return null;
}
