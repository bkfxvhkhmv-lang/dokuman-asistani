import { useEffect } from 'react';
import { API_BASE } from '@/config';

async function pingOnce(): Promise<boolean> {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const url = `${base}/health/`;
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
        console.warn('[BackendHealth] Reachability check failed for', `${API_BASE}/health/`);
      }
    });
    return undefined;
  }, []);
  return null;
}
