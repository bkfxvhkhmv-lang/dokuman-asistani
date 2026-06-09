import type { DocumentCorners } from '@/modules/scanner/types';
import { LAST_GOOD_GATE } from '@/modules/scanner/engine/scanner-thresholds';

/**
 * Manages two sliding windows of detected corners:
 *
 * - lastFrame: any corner set that passed the live gate (for edge-confidence tracking).
 * - lastGood:  corner sets that also meet LAST_GOOD_GATE quality thresholds,
 *              retained for still-photo capture fallback within WINDOW_MS.
 */
export class CornerCache {
  private lastFrameTs = 0;

  private lastGoodTs = 0;
  private lastGoodCorners: DocumentCorners | null = null;
  private lastGoodConf = 0;

  /** Call when a frame passes the live gate. Updates both windows. */
  onFrameAccepted(corners: DocumentCorners): void {
    const now = Date.now();
    this.lastFrameTs = now;

    if (
      corners.confidence >= LAST_GOOD_GATE.CONFIDENCE_MIN &&
      (corners.areaScore ?? 0) >= LAST_GOOD_GATE.AREA_MIN &&
      (corners.angleScore ?? 0) >= LAST_GOOD_GATE.ANGLE_MIN
    ) {
      this.lastGoodTs = now;
      this.lastGoodCorners = corners;
      this.lastGoodConf = corners.confidence;
    }
  }

  /**
   * Call when a frame fails the live gate.
   * Expires the last-good window if it is older than 3 s.
   * Returns ms since the last accepted frame (Infinity if never seen).
   */
  onFrameRejected(): number {
    const now = Date.now();

    if (this.lastGoodTs > 0 && now - this.lastGoodTs > 3000) {
      this.lastGoodTs = 0;
      this.lastGoodCorners = null;
      this.lastGoodConf = 0;
    }

    return this.lastFrameTs > 0 ? now - this.lastFrameTs : Infinity;
  }

  /**
   * Best cached corners for still-photo capture fallback.
   * Returns null when the window is expired or below threshold.
   */
  get captureCorners(): { corners: DocumentCorners; confidence: number } | null {
    if (!this.lastGoodCorners || this.lastGoodTs === 0) return null;

    const age = Date.now() - this.lastGoodTs;
    if (age >= LAST_GOOD_GATE.WINDOW_MS) return null;
    if (this.lastGoodConf < LAST_GOOD_GATE.CONFIDENCE_MIN) return null;

    return { corners: this.lastGoodCorners, confidence: this.lastGoodConf };
  }

  reset(): void {
    this.lastFrameTs = 0;
    this.lastGoodTs = 0;
    this.lastGoodCorners = null;
    this.lastGoodConf = 0;
  }
}
