import { uploadDocumentV4Safe } from '@/services/v4FileService';
import { attachV4JobPolling, type AttachV4JobPollingOptions } from '@/services/v4DocumentJobPoll';
import { alertUploadFailedRetry } from '@/services/uploadUserAlert';
import type { StoreAction } from '@/store/actions';

function parseV4JobStatus(raw: unknown): 'pending' | 'processing' | 'completed' | 'failed' | undefined {
  if (typeof raw !== 'string') return undefined;
  const s = raw.trim().toLowerCase();
  if (s === 'pending' || s === 'processing' || s === 'completed' || s === 'failed') return s;
  return undefined;
}

/**
 * V4 foto yükleme + başarılı olunca job polling başlatır; hata için Alert yeniden deneme sunar.
 */
export interface EnqueueV4UploadOptions {
  /** If true, do not show the default retry Alert on upload failure. */
  suppressAlert?: boolean;
  /** Forwarded to attachV4JobPolling — labeler uses this to defer store writes. */
  suppressResultApply?: boolean;
  onUploaded?: (result: { remoteDocId: string; duplicate: boolean; existingDocumentId: string | null }) => void;
  onCompleted?: (remoteDocId: string) => void;
  onFailed?: () => void;
}

function toPollingOptions(options?: EnqueueV4UploadOptions): AttachV4JobPollingOptions | undefined {
  if (!options) return undefined;
  const { suppressResultApply, onCompleted, onFailed } = options;
  if (!suppressResultApply && !onCompleted && !onFailed) return undefined;
  return { suppressResultApply, onCompleted, onFailed };
}

export function enqueueV4Upload(
  dispatch: (a: StoreAction) => void,
  localDocumentId: string,
  fileUri: string,
  filename: string,
  options?: EnqueueV4UploadOptions,
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
        options?.onFailed?.();
        return;
      }
      const remoteId = (
        result.duplicate === true && typeof result.existing_document_id === 'string'
          ? result.existing_document_id.trim()
          : result.id.trim()
      );
      options?.onUploaded?.({
        remoteDocId: remoteId,
        duplicate: result.duplicate === true,
        existingDocumentId:
          typeof result.existing_document_id === 'string' ? result.existing_document_id.trim() : null,
      });
      const st = parseV4JobStatus(result.status);
      dispatch({
        type:    'UPDATE_DOKUMENT',
        payload: {
          id:        localDocumentId,
          v4DocId:   remoteId,
          ...(st ? { v4JobStatus: st } : {}),
        },
      });
      attachV4JobPolling(dispatch, localDocumentId, remoteId, toPollingOptions(options));
    } catch (e) {
      dispatch({
        type:    'UPDATE_DOKUMENT',
        payload: { id: localDocumentId, v4JobStatus: 'failed' },
      });
      options?.onFailed?.();
      if (!options?.suppressAlert) {
        await alertUploadFailedRetry(() => void run(), e);
      }
    }
  };
  void run();
}
