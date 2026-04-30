/**
 * "Sayfaları düzenle" (AdvancedBatch) için paylaşılan tipler.
 * Normal BatchView’daki `batch/types` daha sıkıdır; burada görüntü düzenleme için serbest alanlar kalır.
 */

export interface AdvancedBatchPageData {
  id: string;
  uri: string;
  order: number;
  filter?: string;
  corners?: unknown;
  enhanced?: boolean;
  capture?: unknown;
  imageSession?: {
    finalUri?: string;
    [key: string]: unknown;
  };
  ocr?: unknown;
  metadata?: Record<string, unknown>;
}

export interface UndoEntry {
  snapshot: AdvancedBatchPageData[];
  message: string;
  hint: string;
  expiresAt: number;
}

export interface AdvancedBatchViewProps {
  pages: AdvancedBatchPageData[];
  onBack: () => void;
  onOpenPageEditor: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  /** useBatch.rotatePage bazen Promise<boolean | undefined> döner. */
  onRotate: (id: string) => Promise<void | boolean | undefined> | void;
  onRemove: (id: string) => void;
  onAddPageLike: (page: AdvancedBatchPageData) => void;
  /** BatchManager görünüm için tam `BatchPage` dizisi gerektirir; gelişmiş ekranın snapshot verisi yüzünden bağlayıcıda cast edilir. */
  onReplacePages: (pages: AdvancedBatchPageData[]) => void;
}

export function clonePages(pages: AdvancedBatchPageData[]): AdvancedBatchPageData[] {
  if (typeof structuredClone === 'function') return structuredClone(pages);
  return JSON.parse(JSON.stringify(pages)) as AdvancedBatchPageData[];
}
