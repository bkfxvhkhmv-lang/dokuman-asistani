import { useMemo } from 'react';
import { findLinksForDocument, type LinkingResult } from '../services/SmartLinkingService';
import type { Dokument } from '../store';

export function useSmartLinking(dok: Dokument | null, alleDocs: Dokument[]): LinkingResult | null {
  return useMemo(
    () => (dok ? findLinksForDocument(dok, alleDocs) : null),
    [dok, alleDocs],
  );
}
