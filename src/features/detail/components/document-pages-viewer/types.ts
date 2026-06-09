import type { Dokument, ScannedPage } from '@/store';

export interface DocumentPagesViewerProps {
  visible: boolean;
  pages: ScannedPage[];
  initialIndex?: number;
  onClose: () => void;
  /** Document metadata for human-readable share filenames */
  dok?: Pick<Dokument, 'absender' | 'titel' | 'typ' | 'datum' | 'frist'> | null;
  /** Kullanici sayfalari paylasmak isterse cagrilir (S3'e kadar disabled) */
  onShare?: () => void;
}
