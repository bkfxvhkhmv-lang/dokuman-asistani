import type { DocumentCorners } from '@/modules/scanner/types';
import { LIVE_GATE, GEOM_MARGIN } from '@/modules/scanner/engine/scanner-thresholds';

export type GatePass = { pass: true;  corners: DocumentCorners };
export type GateFail = { pass: false; reason: string };
export type GateResult = GatePass | GateFail;

/** Quality gate for raw corners coming from the native live stream. */
export function checkLiveScanGate(corners: DocumentCorners): GateResult {
  const pts = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  const m = LIVE_GATE.GEOM_MARGIN;

  if (!pts.every(p => p.x >= -m && p.x <= 1 + m && p.y >= -m && p.y <= 1 + m))
    return { pass: false, reason: 'geometry out of bounds' };

  if (corners.confidence < LIVE_GATE.CONFIDENCE_MIN)
    return { pass: false, reason: 'confidence too low' };

  if ((corners.areaScore ?? 1) < LIVE_GATE.AREA_MIN)
    return { pass: false, reason: 'area too small' };

  if ((corners.areaScore ?? 0) > LIVE_GATE.AREA_MAX)
    return { pass: false, reason: 'area too large' };

  if ((corners.angleScore ?? 1) < LIVE_GATE.ANGLE_MIN)
    return { pass: false, reason: 'angle too low' };

  if ((corners.centerScore ?? 1) < LIVE_GATE.CENTER_MIN)
    return { pass: false, reason: 'center too low' };

  if ((corners.aspectScore ?? 0) < LIVE_GATE.ASPECT_MIN)
    return { pass: false, reason: 'aspect too low' };

  return { pass: true, corners };
}

/** Geometry sanity check for corners already mapped to display space. */
export function checkDisplayGeometry(corners: DocumentCorners): boolean {
  const m = GEOM_MARGIN;
  return [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft].every(
    pt => Number.isFinite(pt.x) && Number.isFinite(pt.y)
       && pt.x >= -m && pt.x <= 1 + m
       && pt.y >= -m && pt.y <= 1 + m,
  );
}
