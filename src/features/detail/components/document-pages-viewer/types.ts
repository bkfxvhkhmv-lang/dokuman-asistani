import type { ScannedPage } from '@/store';

export interface DocumentPagesViewerProps {
  visible: boolean;
  pages: ScannedPage[];
  initialIndex?: number;
  onClose: () => void;
  /** Kullanici sayfalari paylasmak isterse cagrilir (S3'e kadar disabled) */
  onShare?: () => void;
}
