import type { Dokument, ScannedPage } from '@/store';

/** Tam ekran görüntüleyici için sayfa listesi: `pages[]` yoksa ana `uri` kullanılır */
export function pagesForViewer(dok: Dokument | null | undefined): ScannedPage[] {
  if (!dok) return [];
  // Signed or imported PDF: uri supersedes individual scan pages so the viewer
  // shows the PDF (with signature) rather than the original JPEG scans.
  if (dok.uri?.toLowerCase().endsWith('.pdf')) {
    return [{ id: `${dok.id}-cover`, uri: dok.uri, order: 0 }];
  }
  if (dok.pages?.length) return dok.pages;
  if (dok.uri) {
    return [{ id: `${dok.id}-cover`, uri: dok.uri, order: 0 }];
  }
  return [];
}
