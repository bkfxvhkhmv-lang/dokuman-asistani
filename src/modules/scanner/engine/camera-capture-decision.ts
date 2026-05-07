import type { DocumentCorners } from '@/modules/scanner/types';

export interface CaptureDecisionQuality {
  confidence: number;
  areaScore: number;
  angleScore: number;
  aspectScore: number;
  centerScore: number;
  passed: boolean;
  reason: string;
}

export interface CaptureDecisionPolicy {
  allowGuideFrameFallback: boolean;
  requireAtLeastOneRealDetection: boolean;
  minConfidence: number;
  minAreaScore: number;
  maxAreaScore: number;
  minAngleScore: number;
  minAspectScore: number;
  minCenterScore: number;
}

export interface CaptureDecision {
  shouldCapture: boolean;
  usedRealDetection: boolean;
  fallbackApplied: boolean;
  quality: CaptureDecisionQuality;
  reason: string;
}

export const STRICT_FALLBACK_POLICY: CaptureDecisionPolicy = {
  allowGuideFrameFallback: false,
  requireAtLeastOneRealDetection: true,
  minConfidence: 0.35,
  minAreaScore: 0.01,
  maxAreaScore: 1.0,
  minAngleScore: 0.40,
  minAspectScore: 0.15,
  minCenterScore: 0.25,
};

function scoreOrDefault(value: number | undefined, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function isMissingAspectScore(value: number | undefined): boolean {
  return value === undefined || value === 0;
}

function evaluateQuality(
  corners: DocumentCorners | null,
  policy: CaptureDecisionPolicy,
): CaptureDecisionQuality {
  const confidence = corners?.confidence ?? 0;
  const areaScore = scoreOrDefault(corners?.areaScore, 1);
  const angleScore = scoreOrDefault(corners?.angleScore, 1);
  const rawAspectScore = corners?.aspectScore;
  const aspectScore = scoreOrDefault(rawAspectScore, 1);
  const centerScore = scoreOrDefault(corners?.centerScore, 1);
  const failures: string[] = [];

  if (confidence < policy.minConfidence) failures.push('confidence');
  if (areaScore < policy.minAreaScore) failures.push('area_min');
  if (areaScore > policy.maxAreaScore) failures.push('area_max');
  if (angleScore < policy.minAngleScore) failures.push('angle');
  if (!isMissingAspectScore(rawAspectScore) && aspectScore < policy.minAspectScore) failures.push('aspect');
  if (centerScore < policy.minCenterScore) failures.push('center');

  return {
    confidence,
    areaScore,
    angleScore,
    aspectScore,
    centerScore,
    passed: failures.length === 0,
    reason: failures.length === 0 ? 'ok' : failures.join(','),
  };
}

export function decideCapture(
  hasRealDetection: boolean,
  corners: DocumentCorners | null,
  policy: CaptureDecisionPolicy = STRICT_FALLBACK_POLICY,
): CaptureDecision {
  const quality = evaluateQuality(corners, policy);

  if (!hasRealDetection) {
    return {
      shouldCapture: false,
      usedRealDetection: false,
      fallbackApplied: false,
      quality,
      reason: policy.requireAtLeastOneRealDetection
        ? 'no_real_detection'
        : 'fallback_disabled',
    };
  }

  if (!quality.passed) {
    return {
      shouldCapture: false,
      usedRealDetection: true,
      fallbackApplied: false,
      quality,
      reason: `quality_rejected:${quality.reason}`,
    };
  }

  return {
    shouldCapture: true,
    usedRealDetection: true,
    fallbackApplied: false,
    quality,
    reason: 'real_detection_ok',
  };
}
