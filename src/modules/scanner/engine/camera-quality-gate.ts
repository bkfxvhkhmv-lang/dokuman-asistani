import type { DocumentCorners } from '@/modules/scanner/types';
import { TIER_THRESHOLDS, GEOM_MARGIN } from '@/modules/scanner/engine/scanner-thresholds';

export type CameraQualityTier = 'excellent' | 'good' | 'acceptable' | 'poor' | 'rejected';

export interface CameraQualityGateResult {
  passed: boolean;
  tier: CameraQualityTier;
  confidence: number;
  areaScore: number;
  angleScore: number;
  aspectScore: number;
  centerScore: number;
}

const T = TIER_THRESHOLDS;

function withDefault(value: number | undefined, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function geometryValid(corners: DocumentCorners): boolean {
  const m = GEOM_MARGIN;
  return [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft]
    .every(pt => Number.isFinite(pt.x) && Number.isFinite(pt.y)
              && pt.x >= -m && pt.x <= 1 + m
              && pt.y >= -m && pt.y <= 1 + m);
}

export function runQualityGateFromCorners(corners: DocumentCorners | null | undefined): CameraQualityGateResult {
  if (!corners) {
    return {
      passed: false,
      tier: 'rejected',
      confidence: 0,
      areaScore: 0,
      angleScore: 0,
      aspectScore: 0,
      centerScore: 0,
    };
  }

  if (!geometryValid(corners)) {
    return {
      passed: false,
      tier: 'rejected',
      confidence: corners.confidence ?? 0,
      areaScore: withDefault(corners.areaScore, 0),
      angleScore: withDefault(corners.angleScore, 0),
      aspectScore: withDefault(corners.aspectScore, 0),
      centerScore: withDefault(corners.centerScore, 0),
    };
  }

  const confidence = corners.confidence ?? 0;
  const areaScore = withDefault(corners.areaScore, 0);
  const angleScore = withDefault(corners.angleScore, 0);
  const aspectScore = withDefault(corners.aspectScore, 0);
  const centerScore = withDefault(corners.centerScore, 0);

  let tier: CameraQualityTier = 'rejected';

  const aspectOk = (threshold: number) => aspectScore >= threshold;

  if (
    confidence >= T.excellent.confidence &&
    areaScore >= T.excellent.area_min && areaScore <= T.excellent.area_max &&
    angleScore >= T.excellent.angle &&
    aspectOk(T.excellent.aspect) &&
    centerScore >= T.excellent.center
  ) {
    tier = 'excellent';
  } else if (
    confidence >= T.good.confidence &&
    areaScore >= T.good.area_min && areaScore <= T.good.area_max &&
    angleScore >= T.good.angle &&
    aspectOk(T.good.aspect) &&
    centerScore >= T.good.center
  ) {
    tier = 'good';
  } else if (
    confidence >= T.acceptable.confidence &&
    areaScore >= T.acceptable.area_min && areaScore <= T.acceptable.area_max &&
    angleScore >= T.acceptable.angle &&
    aspectOk(T.acceptable.aspect) &&
    centerScore >= T.acceptable.center
  ) {
    tier = 'acceptable';
  } else if (
    confidence >= T.poor.confidence &&
    areaScore >= T.poor.area_min &&
    angleScore >= T.poor.angle
  ) {
    tier = 'poor';
  }

  return {
    passed: tier === 'excellent' || tier === 'good' || tier === 'acceptable',
    tier,
    confidence,
    areaScore,
    angleScore,
    aspectScore,
    centerScore,
  };
}
