import type { StoreAction } from '@/store/actions';
import { getDocumentV4 } from '@/services/v4-api/documents';
import type { V4Document } from '@/services/v4-api/types';

/**
 * Backend `GET /documents/:id` ile pending/processing için arka plan taraması;
 * güncellemeleri `v4JobStatus` alanıyla store'a yazar; completed/failed veya max denemede durur.
 */
export function attachV4JobPolling(dispatch: (a: StoreAction) => void, localDocId: string, remoteDocId: string): void {
  let tries = 0;
  const maxTries = 48;

  const tick = async (): Promise<void> => {
    tries += 1;
    try {
      const d = await getDocumentV4(remoteDocId);
      const st = normalizeStatus(d);
      if (st) {
        dispatch({
          type:    'UPDATE_DOKUMENT',
          payload: { id: localDocId, v4JobStatus: st },
        });
      }
      const done = st === 'completed' || st === 'failed';
      if (done || tries >= maxTries) return;
      setTimeout(() => void tick(), 2600);
    } catch {
      if (tries < maxTries) setTimeout(() => void tick(), 4000);
    }
  };

  void tick();
}

function normalizeStatus(d: V4Document): 'pending' | 'processing' | 'completed' | 'failed' | null {
  const s = typeof d.status === 'string' ? d.status.trim().toLowerCase() : '';
  if (!s) return null;
  if (s === 'pending' || s === 'processing' || s === 'completed' || s === 'failed') return s;
  return null;
}
