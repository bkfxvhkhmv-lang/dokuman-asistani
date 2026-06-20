/** Pure helper for §3 visible-card limit tests. */
export function countVisibleDetailSurfaces(opts: {
  hasSummaryCard: boolean;
  hasPrimaryAction: boolean;
  hasSecondaryAction: boolean;
}): number {
  return [
    opts.hasSummaryCard,
    opts.hasPrimaryAction,
    opts.hasSecondaryAction,
  ].filter(Boolean).length;
}

export const DETAIL_VISIBLE_CARD_MAX = 3;
