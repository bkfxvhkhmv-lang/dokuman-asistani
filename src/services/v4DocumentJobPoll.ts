import type { StoreAction } from '@/store/actions';
import { getDocumentV4, getDocumentWorkerResult } from '@/services/v4-api/documents';
import type { V4Document, BackendWorkerResult } from '@/services/v4-api/types';
import type { Dokument } from '@/store/types';
import {
  hasWorkerResultAiMeta,
  WORKER_RESULT_META_RETRY_MAX,
  WORKER_RESULT_META_RETRY_MS,
} from '@/features/ocr-mvp/adapters/workerResultToOcrMvpStatus';

export interface AttachV4JobPollingOptions {
  getDok?: (localId: string) => Dokument | undefined;
  /** When true, completed jobs do not auto-apply worker result to the store. */
  suppressResultApply?: boolean;
  onCompleted?: (remoteDocId: string) => void;
  onFailed?: () => void;
}

function resolvePollingOptions(
  getDokOrOptions?: ((localId: string) => Dokument | undefined) | AttachV4JobPollingOptions,
): AttachV4JobPollingOptions {
  if (typeof getDokOrOptions === 'function') {
    return { getDok: getDokOrOptions };
  }
  return getDokOrOptions ?? {};
}

/**
 * Backend `GET /documents/:id` ile pending/processing için arka plan taraması;
 * güncellemeleri `v4JobStatus` alanıyla store'a yazar; completed/failed veya max denemede durur.
 * completed durumunda canonical result endpoint'ten zenginleştirilmiş veri çekilir.
 *
 * getDok: mevcut dokümanı okur; ai* alanlar için aiLabelledAt guard'ı etkinleştirir.
 * suppressResultApply: labeler gibi çağrılar store'a ai* yazmadan yalnızca callback alır.
 */
export function attachV4JobPolling(
  dispatch: (a: StoreAction) => void,
  localDocId: string,
  remoteDocId: string,
  getDokOrOptions?: ((localId: string) => Dokument | undefined) | AttachV4JobPollingOptions,
): void {
  const options = resolvePollingOptions(getDokOrOptions);
  let tries = 0;
  const maxTries = 48;

  const finishFailed = (): void => {
    options.onFailed?.();
  };

  const finishCompleted = (): void => {
    if (options.suppressResultApply) {
      options.onCompleted?.(remoteDocId);
      return;
    }
    void fetchAndApplyWorkerResult(
      dispatch,
      localDocId,
      remoteDocId,
      options.getDok,
      options.onCompleted,
    );
  };

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
      if (st === 'failed') {
        finishFailed();
        return;
      }
      const done = st === 'completed' || tries >= maxTries;
      if (done) {
        if (st === 'completed') {
          finishCompleted();
        } else {
          finishFailed();
        }
        return;
      }
      setTimeout(() => void tick(), 2600);
    } catch {
      if (tries < maxTries) {
        setTimeout(() => void tick(), 4000);
      } else {
        finishFailed();
      }
    }
  };

  void tick();
}

async function fetchAndApplyWorkerResult(
  dispatch: (a: StoreAction) => void,
  localDocId: string,
  remoteDocId: string,
  getDok?: (localId: string) => Dokument | undefined,
  onCompleted?: (remoteDocId: string) => void,
): Promise<void> {
  let result: BackendWorkerResult | null = null;
  for (let attempt = 0; attempt <= WORKER_RESULT_META_RETRY_MAX; attempt += 1) {
    try {
      result = await getDocumentWorkerResult(remoteDocId);
    } catch {
      return;
    }
    if (hasWorkerResultAiMeta(result) || attempt >= WORKER_RESULT_META_RETRY_MAX) {
      break;
    }
    await delay(WORKER_RESULT_META_RETRY_MS);
  }
  if (!result) return;

  // getDok completed anında çağrılır; aiLabelledAt en güncel değeri okur
  const existingDok = getDok?.(localDocId) ?? null;
  const update = buildResultUpdate(localDocId, result, existingDok);
  if (Object.keys(update).length > 1) {
    dispatch({ type: 'UPDATE_DOKUMENT', payload: update });
  }
  onCompleted?.(remoteDocId);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * BackendWorkerResult → Partial<Dokument> güvenli mapping.
 *
 * Yazılan alanlar: confidence, detectedLanguage, ocrJobId, rohText,
 *   aiDisplayTitle, aiDocumentType, aiSender, aiLabelledAt.
 *
 * Asla yazılmayan alanlar: customTitle, titel, typ, absender,
 *   frist, betrag, zusammenfassung, kurzfassung, iban.
 *
 * aiLabelledAt guard:
 *   - existingDok.aiLabelledAt zaten set ise hiçbir ai* alanı yazılmaz.
 *   - En az bir ai* alanı yazılıyorsa aiLabelledAt current timestamp olarak set edilir.
 *   - Sadece rohText / confidence / detectedLanguage geldiğinde aiLabelledAt yazılmaz.
 */
export function buildResultUpdate(
  localDocId: string,
  result: BackendWorkerResult,
  existingDok?: Pick<Dokument, 'aiLabelledAt'> | null,
): Partial<Dokument> & { id: string } {
  const update: Partial<Dokument> & { id: string } = { id: localDocId };

  if (result.confidence != null) {
    update.confidence = result.confidence;
  }

  const lang = result.language?.trim() ?? '';
  if (lang) {
    update.detectedLanguage = lang;
  }

  if (result.job_id) {
    update.ocrJobId = result.job_id;
  }

  const doc = result.document;
  if (doc) {
    const rawText = doc.raw_text?.trim() ?? '';
    if (rawText) {
      update.rohText = rawText;
    }

    // ai* alanlar: kullanıcı önceden kabul ettiyse (aiLabelledAt set) overwrite yok
    const alreadyLabelled = !!existingDok?.aiLabelledAt;
    if (!alreadyLabelled) {
      const suggestedTitle = doc.suggested_title?.trim() ?? '';
      if (suggestedTitle) {
        update.aiDisplayTitle = suggestedTitle;
      }

      const docType = doc.document_type?.trim() ?? '';
      if (docType) {
        update.aiDocumentType = docType;
      }

      const sender = doc.sender?.trim() ?? '';
      if (sender) {
        update.aiSender = sender;
      }

      // aiLabelledAt: yalnızca en az bir ai* alanı backend'den yazıldıysa set edilir
      if (update.aiDisplayTitle || update.aiDocumentType || update.aiSender) {
        update.aiLabelledAt = new Date().toISOString();
      }
    }
  }

  return update;
}

function normalizeStatus(d: V4Document): 'pending' | 'processing' | 'completed' | 'failed' | null {
  const s = typeof d.status === 'string' ? d.status.trim().toLowerCase() : '';
  if (!s) return null;
  if (s === 'pending' || s === 'processing' || s === 'completed' || s === 'failed') return s;
  return null;
}
