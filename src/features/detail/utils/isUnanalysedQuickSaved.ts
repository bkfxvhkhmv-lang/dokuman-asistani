import type { OcrMvpStatus } from '@/hooks/useOcrMvpJob';
import type { Dokument } from '@/store';

export function isUnanalysedQuickSaved(
  dok: Dokument | null | undefined,
  analyzeStatus?: OcrMvpStatus,
): boolean {
  if (!dok?.uri) return false;
  if ((dok.rohText?.trim().length ?? 0) > 0) return false;
  if (analyzeStatus === 'uploading' || analyzeStatus === 'processing') return false;
  if (dok.v4JobStatus === 'pending' || dok.v4JobStatus === 'processing') return false;
  return true;
}
