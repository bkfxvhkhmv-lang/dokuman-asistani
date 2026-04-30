import type { DocumentAnalysis } from '@/services/visionApi';

import type { CategoryResult } from './types';

export function applyCategoryToVisionResult(
  visionResult: DocumentAnalysis,
  catResult: CategoryResult,
): DocumentAnalysis {
  return {
    ...visionResult,
    typ: catResult.typ,
  };
}
