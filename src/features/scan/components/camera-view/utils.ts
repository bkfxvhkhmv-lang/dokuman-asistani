import type { BatchPage } from '@/modules/batch/types';

export function getBatchPageThumbUri(page: BatchPage): string {
  const s = page.imageSession;
  if (s) {
    return (
      s.enhancedUri
      ?? s.finalUri
      ?? s.previewUri
      ?? s.croppedUri
      ?? s.correctedUri
      ?? s.originalUri
    );
  }
  const cap = page.capture;
  if (cap) {
    return cap.finalUri ?? cap.enhancedUri ?? cap.uri ?? page.uri;
  }
  return page.uri;
}
