import type { CaptureResult } from '@/modules/scanner/types';
import { runQualityGateFromCorners } from '@/modules/scanner/engine/camera-quality-gate';

const TIER_RANK = {
  excellent: 4,
  good: 3,
  acceptable: 2,
  poor: 1,
  rejected: 0,
} as const;

const MIN_TIER_FOR_PAGE_ADD = 'acceptable' as const;

export function shouldAddPage(capture: CaptureResult | null): { allow: boolean; reason: string } {
  if (!capture?.corners) {
    return {
      allow: false,
      reason: 'Capture ohne Ecken; Page abgelehnt.',
    };
  }

  const quality = runQualityGateFromCorners(capture.corners);
  if (TIER_RANK[quality.tier] < TIER_RANK[MIN_TIER_FOR_PAGE_ADD]) {
    return {
      allow: false,
      reason: `Qualitat ${quality.tier} unter Minimum ${MIN_TIER_FOR_PAGE_ADD}; Page abgelehnt.`,
    };
  }

  return {
    allow: true,
    reason: `Page erlaubt mit Qualitat ${quality.tier}.`,
  };
}
