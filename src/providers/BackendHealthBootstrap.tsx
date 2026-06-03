import { useEffect } from 'react';
import { OCR_MVP_BASE } from '@/config';

async function pingOnce(): Promise<boolean> {
  const url = `${OCR_MVP_BASE}/health`;
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
        console.warn('[BackendHealth] Reachability check failed for', `${OCR_MVP_BASE}/health`);
      }
    });
    return undefined;
  }, []);
  return null;
}
