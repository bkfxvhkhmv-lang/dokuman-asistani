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
  onEdit?: () => void;
  onExport?: () => void;
  onLoeschen?: () => void;
  /** Suppresses review/missing badges when the document has not been analysed yet. */
  isUnanalysedQuickSaved?: boolean;
}
