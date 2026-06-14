import { buildDocStacks } from '@/services/CardStackService';
import type { Dokument } from '@/store';
import { filterBySearch } from '@/utils/search';
import {
  HOME_STACK_TABS,
  HOME_TAB_EMPTY_VARIANT,
  type BuildHomeFeedModelParams,
  type HomeFeedItem,
  type HomeFeedModel,
} from '@/features/home/feed/homeFeedTypes';

const DEFAULT_INITIAL_LIMIT = 6;
const STACKING_INITIAL_LIMIT = 20;
const SEARCH_MIN_LENGTH = 2;

export function docFingerprint(d: Dokument): string {
  return `${d.typ}|${d.betrag}|${d.absender}`;
}

/** First-occurrence dedup by typ+betrag+absender (matches HomeRecentList). */
export function dedupeDocsByFingerprint(docs: Dokument[]): Dokument[] {
  const seen = new Set<string>();
  const out: Dokument[] = [];
  for (const d of docs) {
    const fp = docFingerprint(d);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(d);
  }
  return out;
}

export function filterSectionDocs(docs: Dokument[]): Dokument[] {
  return docs.filter(d => !d.isOptimistic && !(d as { _duplikat?: boolean })._duplikat);
}

export function resolveInitialLimit(useStacking: boolean): number {
  return useStacking ? STACKING_INITIAL_LIMIT : DEFAULT_INITIAL_LIMIT;
}

export function buildHomeFeedModel(params: BuildHomeFeedModelParams): HomeFeedModel {
  const {
    aktiv,
    secilenModus,
    listQuery,
    showAll,
    section,
    prefetchSource = [],
  } = params;

  const useStacking = HOME_STACK_TABS.has(aktiv);
  const allDocs = filterSectionDocs(section.docs);
  const deduped = dedupeDocsByFingerprint(allDocs);
  const initialLimit = resolveInitialLimit(useStacking);

  const normalizedQuery = listQuery.trim();
  const listBase = showAll ? allDocs : deduped;
  const searched =
    normalizedQuery.length >= SEARCH_MIN_LENGTH
      ? filterBySearch(listBase, { query: normalizedQuery })
      : listBase;
  const effectiveShowAll = showAll || normalizedQuery.length >= SEARCH_MIN_LENGTH;
  const visibleDocs = searched.slice(0, effectiveShowAll ? searched.length : initialLimit);

  const hiddenByDedupe = !showAll && allDocs.length > deduped.length;
  const hiddenByLimit = !effectiveShowAll && searched.length > initialLimit;
  const showExpandAffordance =
    !secilenModus && normalizedQuery.length < SEARCH_MIN_LENGTH && (hiddenByDedupe || hiddenByLimit);

  const emptyVariant = HOME_TAB_EMPTY_VARIANT[aktiv] ?? 'generic';
  const emptyReason: HomeFeedModel['emptyReason'] =
    visibleDocs.length === 0
      ? normalizedQuery.length >= SEARCH_MIN_LENGTH
        ? 'search'
        : 'tab-empty'
      : null;

  const stacks = useStacking ? buildDocStacks(visibleDocs) : null;

  const items: HomeFeedItem[] = stacks
    ? stacks.map((stack, index) => ({
        type: 'stack' as const,
        key: stack.id,
        stack,
        index,
      }))
    : visibleDocs.map((dok, index) => ({
        type: 'doc' as const,
        key: dok.id,
        dok,
        index,
      }));

  const prefetchDocIds = prefetchSource.slice(0, 1).map(d => d.id);

  return {
    section,
    emptyReason,
    emptyVariant,
    items,
    useStacking,
    showExpandAffordance,
    hiddenByDedupe,
    allDocsCount: allDocs.length,
    displayedCount: visibleDocs.length,
    prefetchDocIds,
  };
}
