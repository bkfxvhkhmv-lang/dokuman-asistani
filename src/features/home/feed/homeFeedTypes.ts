import type { EmptyVariant } from '@/components/EmptyState';
import type { Dokument } from '@/store';
import type { DocStack } from '@/services/CardStackService';

export const HOME_STACK_TABS = new Set(['Aufgaben', 'Zahlungen']);

export const HOME_TAB_EMPTY_VARIANT: Record<string, EmptyVariant> = {
  Aufgaben: 'tasks',
  Dokumente: 'docs',
  Ordner: 'folder',
  Kalender: 'calendar',
  Zahlungen: 'payments',
};

export interface HomeFeedSection {
  title: string;
  eyebrow: string;
  subtitle?: string;
  docs: Dokument[];
}

export type HomeFeedEmptyReason = 'search' | 'tab-empty';

export type HomeFeedItem =
  | { type: 'stack'; key: string; stack: DocStack; index: number }
  | { type: 'doc'; key: string; dok: Dokument; index: number };

export interface HomeFeedModel {
  section: HomeFeedSection;
  emptyReason: HomeFeedEmptyReason | null;
  emptyVariant: EmptyVariant;
  items: HomeFeedItem[];
  useStacking: boolean;
  showExpandAffordance: boolean;
  hiddenByDedupe: boolean;
  allDocsCount: number;
  displayedCount: number;
  /** Top doc ids for predictive prefetch (max 1 today). */
  prefetchDocIds: string[];
}

export interface BuildHomeFeedModelParams {
  aktiv: string;
  secilenModus: boolean;
  listQuery: string;
  showAll: boolean;
  section: HomeFeedSection;
  /** Visible docs for prefetch selection (typically `sichtbareDocs`). */
  prefetchSource?: Dokument[];
}
