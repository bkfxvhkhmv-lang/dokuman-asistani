import type { DocumentCorners } from '@/modules/scanner/types';

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

const CONFIDENCE_EXCELLENT = 0.75;
const CONFIDENCE_GOOD = 0.62;
const CONFIDENCE_ACCEPTABLE = 0.45;
const AREA_MIN = 0.01;
const AREA_MAX = 1.0;
const ANGLE_GOOD = 0.60;
const ANGLE_ACCEPTABLE = 0.40;
const ASPECT_GOOD = 0.20;
const ASPECT_ACCEPTABLE = 0.15;
const CENTER_GOOD = 0.30;
const CENTER_ACCEPTABLE = 0.25;

function withDefault(value: number | undefined, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
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

  const confidence = corners.confidence ?? 0;
  const areaScore = withDefault(corners.areaScore, 1);
  const angleScore = withDefault(corners.angleScore, 1);
  const aspectScore = withDefault(corners.aspectScore, 1);
  const centerScore = withDefault(corners.centerScore, 1);

  let tier: CameraQualityTier = 'rejected';

  // aspectScore=0 means native didn't compute it (e.g. non-standard receipt aspect ratio) — treat as passing
  const aspectOk = (threshold: number) => aspectScore === 0 || aspectScore >= threshold;

  if (
    confidence >= CONFIDENCE_EXCELLENT &&
    areaScore >= 0.08 &&
    areaScore <= AREA_MAX &&
    angleScore >= 0.72 &&
    aspectOk(0.30) &&
    centerScore >= 0.40
  ) {
    tier = 'excellent';
  } else if (
    confidence >= CONFIDENCE_GOOD &&
    areaScore >= AREA_MIN &&
    areaScore <= AREA_MAX &&
    angleScore >= ANGLE_GOOD &&
    aspectOk(ASPECT_GOOD) &&
    centerScore >= CENTER_GOOD
  ) {
    tier = 'good';
  } else if (
    confidence >= CONFIDENCE_ACCEPTABLE &&
    areaScore >= AREA_MIN &&
    areaScore <= AREA_MAX &&
    angleScore >= ANGLE_ACCEPTABLE &&
    aspectOk(ASPECT_ACCEPTABLE) &&
    centerScore >= CENTER_ACCEPTABLE
  ) {
    tier = 'acceptable';
  } else if (
    confidence >= 0.30 &&
    areaScore >= 0.03 &&
    angleScore >= 0.20
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
