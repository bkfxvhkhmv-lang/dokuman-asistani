import type { DocumentCorners } from '@/modules/scanner/types';
import { CAPTURE_GATE } from '@/modules/scanner/engine/scanner-thresholds';

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
  minConfidence: CAPTURE_GATE.CONFIDENCE_MIN,
  minAreaScore:  CAPTURE_GATE.AREA_MIN,
  maxAreaScore:  CAPTURE_GATE.AREA_MAX,
  minAngleScore: CAPTURE_GATE.ANGLE_MIN,
  minAspectScore: CAPTURE_GATE.ASPECT_MIN,
  minCenterScore: CAPTURE_GATE.CENTER_MIN,
};

function scoreOrDefault(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function evaluateQuality(
  corners: DocumentCorners | null,
  policy: CaptureDecisionPolicy,
): CaptureDecisionQuality {
  const confidence = corners?.confidence ?? 0;
  // Pessimistic defaults: missing score = 0 (fail), not 1 (pass).
  // Exception: areaScore defaults to a passing value only when genuinely absent,
  // since some detectors omit it for very large quads.
  const areaScore = scoreOrDefault(corners?.areaScore, policy.minAreaScore);
  const angleScore = scoreOrDefault(corners?.angleScore, 0);
  const aspectScore = scoreOrDefault(corners?.aspectScore, 0);
  const centerScore = scoreOrDefault(corners?.centerScore, 0);
  const failures: string[] = [];

  if (confidence < policy.minConfidence) failures.push('confidence');
  if (areaScore < policy.minAreaScore) failures.push('area_min');
  if (areaScore > policy.maxAreaScore) failures.push('area_max');
  if (angleScore < policy.minAngleScore) failures.push('angle');
  if (aspectScore < policy.minAspectScore) failures.push('aspect');
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
