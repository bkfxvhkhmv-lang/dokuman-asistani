import type { StoreAction } from '@/store/actions';
import { getDocumentV4, getDocumentWorkerResult } from '@/services/v4-api/documents';
import type { V4Document, BackendWorkerResult } from '@/services/v4-api/types';
import type { Dokument } from '@/store/types';

/**
 * Backend `GET /documents/:id` ile pending/processing için arka plan taraması;
 * güncellemeleri `v4JobStatus` alanıyla store'a yazar; completed/failed veya max denemede durur.
 * completed durumunda canonical result endpoint'ten zenginleştirilmiş veri çekilir.
 *
 * getDok: mevcut dokümanı okur; ai* alanlar için aiLabelledAt guard'ı etkinleştirir.
 * Opsiyonel — mevcut çağıranlar (v4EnqueueUpload) değişmeden çalışmaya devam eder.
 */
export function attachV4JobPolling(
  dispatch: (a: StoreAction) => void,
  localDocId: string,
  remoteDocId: string,
  getDok?: (localId: string) => Dokument | undefined,
): void {
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
      if (done || tries >= maxTries) {
        if (st === 'completed') {
          void fetchAndApplyWorkerResult(dispatch, localDocId, remoteDocId, getDok);
        }
        return;
      }
      setTimeout(() => void tick(), 2600);
    } catch {
      if (tries < maxTries) setTimeout(() => void tick(), 4000);
    }
  };

  void tick();
}

async function fetchAndApplyWorkerResult(
  dispatch: (a: StoreAction) => void,
  localDocId: string,
  remoteDocId: string,
  getDok?: (localId: string) => Dokument | undefined,
): Promise<void> {
  let result: BackendWorkerResult;
  try {
    result = await getDocumentWorkerResult(remoteDocId);
  } catch {
    // Fetch fail → polling completed durumu korunur, UI bozulmaz, sessizce atlanır
    return;
  }
  // getDok completed anında çağrılır; aiLabelledAt en güncel değeri okur
  const existingDok = getDok?.(localDocId) ?? null;
  const update = buildResultUpdate(localDocId, result, existingDok);
  if (Object.keys(update).length > 1) {
    dispatch({ type: 'UPDATE_DOKUMENT', payload: update });
  }
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
