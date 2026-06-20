import {
  countVisibleDetailSurfaces,
  DETAIL_VISIBLE_CARD_MAX,
} from '@/features/detail/components/details-panel/detailVisibleCardLimit';

describe('detailVisibleCardLimit', () => {
  it('allows at most 3 visible surfaces', () => {
    expect(
      countVisibleDetailSurfaces({ hasSummaryCard: true, hasPrimaryAction: true, hasSecondaryAction: true }),
    ).toBe(DETAIL_VISIBLE_CARD_MAX);
  });

  it('summary only counts as one visible card', () => {
    expect(
      countVisibleDetailSurfaces({ hasSummaryCard: true, hasPrimaryAction: false, hasSecondaryAction: false }),
    ).toBe(1);
  });

  it('never exceeds max when optional actions absent', () => {
    expect(
      countVisibleDetailSurfaces({ hasSummaryCard: true, hasPrimaryAction: true, hasSecondaryAction: false }),
    ).toBeLessThanOrEqual(DETAIL_VISIBLE_CARD_MAX);
  });
});
