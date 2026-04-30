import { uploadDocumentV4Safe } from '@/services/v4FileService';
import { attachV4JobPolling } from '@/services/v4DocumentJobPoll';
import { alertUploadFailedRetry } from '@/services/uploadUserAlert';
import type { Dokument } from '@/store/types';
import type { StoreAction } from '@/store/actions';

function parseV4JobStatus(raw: unknown): Dokument['v4JobStatus'] | undefined {
  if (typeof raw !== 'string') return undefined;
  const s = raw.trim().toLowerCase();
  if (s === 'pending' || s === 'processing' || s === 'completed' || s === 'failed') return s;
  return undefined;
}

/**
 * V4 foto yükleme + başarılı olunca job polling başlatır; hata için Alert yeniden deneme sunar.
 */
export function enqueueV4Upload(
  dispatch: (a: StoreAction) => void,
  localDocumentId: string,
  fileUri: string,
  filename: string,
): void {
  const run = async (): Promise<void> => {
    dispatch({
      type:    'UPDATE_DOKUMENT',
      payload: { id: localDocumentId, v4JobStatus: 'pending' },
    });
    try {
      const result = await uploadDocumentV4Safe(fileUri, filename);
      if (!result?.id) {
        dispatch({
          type:    'UPDATE_DOKUMENT',
          payload: { id: localDocumentId, v4JobStatus: 'failed' },
        });
        return;
      }
      const st = parseV4JobStatus(result.status);
      dispatch({
        type:    'UPDATE_DOKUMENT',
        payload: {
          id:        localDocumentId,
          v4DocId:   result.id,
          ...(st ? { v4JobStatus: st } : {}),
        },
      });
      attachV4JobPolling(dispatch, localDocumentId, result.id);
    } catch (e) {
      dispatch({
        type:    'UPDATE_DOKUMENT',
        payload: { id: localDocumentId, v4JobStatus: 'failed' },
      });
      await alertUploadFailedRetry(() => void run(), e);
    }
  };
  void run();
}
