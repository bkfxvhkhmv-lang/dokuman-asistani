import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import type { Dokument, StoreAction } from '@/store';
import { useOcrMvpJob, type OcrMvpStatus, type OcrMvpErrorKind } from '@/hooks/useOcrMvpJob';
import { ocrMvpToV4Document } from '@/features/ocr-mvp/adapters/ocrMvpToV4Document';
import { buildAnalyzedDocumentUpdate } from '@/features/detail/hooks/buildAnalyzedDocumentUpdate';
import { useGuestLimit } from '@/hooks/useGuestLimit';
import { toUserFacingAnalyseErrorMessage } from '@/features/detail/utils/toUserFacingAnalyseErrorMessage';
import { useT } from '@/hooks/useT';

export interface UseAnalyzeSavedDocumentReturn {
  isEligible: boolean;
  status: OcrMvpStatus;
  error: string | null;
  errorKind: OcrMvpErrorKind;
  startAnalyze: () => Promise<void>;
}

/**
 * Allows a document that was previously saved with multi-file quick-save
 * (no OCR/AI) to be analysed explicitly from the detail screen.
 *
 * The existing document is updated in-place via UPDATE_DOKUMENT so no
 * duplicate document is created.
 */
export function useAnalyzeSavedDocument(
  dok: Dokument | null | undefined,
  dispatch: ((action: StoreAction) => void) | null | undefined,
): UseAnalyzeSavedDocumentReturn {
  const { t } = useT();
  const { gateOcr } = useGuestLimit();
  const { status, result, error, errorKind, startJob, reset } = useOcrMvpJob();
  const appliedRef = useRef(false);

  const isEligible = !!dok && !dok.rohText && !!dok.uri;

  useEffect(() => {
    if (!dispatch || !dok) return;
    if (status !== 'done' || !result || appliedRef.current) return;

    appliedRef.current = true;

    const draft = ocrMvpToV4Document(result, {
      id: dok.id,
      uri: dok.uri,
      fileRelativePath: dok.fileRelativePath ?? null,
      pages: dok.pages,
    });

    dispatch({
      type: 'UPDATE_DOKUMENT',
      payload: buildAnalyzedDocumentUpdate(dok, draft.document),
    });
  }, [dispatch, dok, result, status]);

  useEffect(() => {
    if (status === 'idle') {
      appliedRef.current = false;
    }
  }, [status]);

  const startAnalyze = useCallback(async () => {
    if (!isEligible || !dok) return;

    Alert.alert(
      'Dokument analysieren',
      'Diese Analyse verwendet 1 Analyse. Fortfahren?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Analysieren',
          onPress: async () => {
            if (!(await gateOcr())) return;

            const fileUri = dok.uri!;
            const name = dok.dateiName ?? dok.customTitle ?? dok.titel ?? 'document.jpg';
            const mimeType = inferMimeType(name);

            void startJob(
              { uri: fileUri, name, mimeType },
              undefined,
              { pageCount: dok.pages?.length ?? 1 },
            );
          },
        },
      ],
      { cancelable: true },
    );
  }, [dok, gateOcr, isEligible, startJob, t]);

  useEffect(() => {
    if (status === 'error' || status === 'timeout') {
      const message = toUserFacingAnalyseErrorMessage(error, status);
      Alert.alert('Analysefehler', message);
      reset();
    }
  }, [error, reset, status]);

  return {
    isEligible,
    status,
    error,
    errorKind,
    startAnalyze,
  };
}

function inferMimeType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}
