import type { Dokument } from '@/store';
import type { ErweiterteFeld, OcrRisikoItem, BeziehungsGraph } from '@/utils/types';

export interface DetailsPanelProps {
  dok: Dokument | undefined;
  mevcutEtiketten?: string[];
  extrahierteFelder?: ErweiterteFeld[];
  aehnlicheDoks?: Array<Dokument & { _aehnlichScore?: number }>;
  ocrRisiken?: OcrRisikoItem[];
  /** Für künftige Graph-Ansicht reserviert. */
  graph?: BeziehungsGraph;
}
