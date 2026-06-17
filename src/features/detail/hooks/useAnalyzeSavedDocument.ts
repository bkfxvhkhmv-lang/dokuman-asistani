import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import type { Dokument, StoreAction } from '@/store';
import type { OcrMvpStatus, OcrMvpErrorKind } from '@/hooks/useOcrMvpJob';
import { useGuestLimit } from '@/hooks/useGuestLimit';
import { buildAnalyseFileFromDocument } from '@/features/detail/utils/buildAnalyseFileFromDocument';
import { toUserFacingAnalyseErrorMessage } from '@/features/detail/utils/toUserFacingAnalyseErrorMessage';
import { enqueueV4Upload } from '@/services/v4EnqueueUpload';
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
 * Uses the new core-api backend:
 *   POST /documents/  →  GET /documents/{id}/result (via v4EnqueueUpload + polling)
 *
 * The existing document is updated in-place via UPDATE_DOKUMENT so no
 * duplicate document is created. Protected fields (customTitle, userOrdner,
 * titel, typ, absender) are never overwritten by this path.
 */
export function useAnalyzeSavedDocument(
  dok: Dokument | null | undefined,
  dispatch: ((action: StoreAction) => void) | null | undefined,
): UseAnalyzeSavedDocumentReturn {
  const { t } = useT();
  const { gateOcr } = useGuestLimit();
  const [dismissedError, setDismissedError] = useState(false);

  const isEligible = !!dok && !dok.rohText && !!dok.uri;

  const status: OcrMvpStatus = useMemo(() => {
    if (!isEligible) return 'idle';
    switch (dok?.v4JobStatus) {
      case 'pending':
        return 'uploading';
      case 'processing':
        return 'processing';
      case 'completed':
        return 'done';
      case 'failed':
        return 'error';
      default:
        return 'idle';
    }
  }, [dok?.v4JobStatus, isEligible]);

  // Reset error dismissal when the job leaves the error state.
  useEffect(() => {
    if (status !== 'error' && dismissedError) {
      setDismissedError(false);
    }
  }, [dismissedError, status]);

  // Surface a single error alert per failed state.
  useEffect(() => {
    if (status === 'error' && !dismissedError) {
      setDismissedError(true);
      const message = toUserFacingAnalyseErrorMessage(null, 'error');
      Alert.alert('Analysefehler', message);
    }
  }, [dismissedError, status]);

  const startAnalyze = useCallback(async () => {
    if (!isEligible || !dok || !dispatch) return;

    Alert.alert(
      'Dokument analysieren',
      'Diese Analyse verwendet 1 Analyse. Fortfahren?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Analysieren',
          onPress: async () => {
            if (!(await gateOcr())) return;

            const file = buildAnalyseFileFromDocument(dok);
            if (!file) {
              Alert.alert(
                'Analysefehler',
                'Dieses Dokument kann derzeit nicht analysiert werden. Der Dateityp konnte nicht erkannt werden. Bitte laden Sie eine PDF-, JPG- oder PNG-Datei erneut hoch.',
              );
              return;
            }

            enqueueV4Upload(
              dispatch,
              dok.id,
              file.uri,
              file.name ?? `${dok.id}.pdf`,
              { suppressAlert: true },
            );
          },
        },
      ],
      { cancelable: true },
    );
  }, [dok, dispatch, gateOcr, isEligible, t]);

  return {
    isEligible,
    status,
    error: status === 'error' ? 'Analysefehler' : null,
    errorKind: status === 'error' ? 'network' : null,
    startAnalyze,
  };
}
