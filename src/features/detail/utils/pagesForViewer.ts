import type { Dokument, ScannedPage } from '@/store';

/** Tam ekran görüntüleyici için sayfa listesi: `pages[]` yoksa ana `uri` kullanılır */
export function pagesForViewer(dok: Dokument | null | undefined): ScannedPage[] {
  if (!dok) return [];
  if (dok.pages?.length) return dok.pages;
  if (dok.uri) {
    return [{ id: `${dok.id}-cover`, uri: dok.uri, order: 0 }];
  }
  return [];
}
