import { DocumentCorners, EdgeDetectionState, ScannerListener, ScannerEvent } from '@/modules/scanner/types';
import { nativeDetectDocumentEdges } from '@/modules/scanner/engine/NativeStub';

export class EdgeDetector {
  private listeners: ScannerListener[] = [];
  private enabled = false;
  private processing = false;
  private lastCorners: DocumentCorners | null = null;
  private previousCorners: DocumentCorners | null = null;
  private lastState: EdgeDetectionState = {
    corners: null,
    confidence: 0,
    stabilityScore: 0,
    detected: false,
  };

  addListener(listener: ScannerListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(event: ScannerEvent) {
    this.listeners.forEach(l => {
      try { l(event); } catch (e) { console.error('Edge detector listener error:', e); }
    });
  }

  enable() { this.enabled = true; }
  disable() {
    this.enabled = false;
    this.lastCorners = null;
    this.previousCorners = null;
    this.lastState = { corners: null, confidence: 0, stabilityScore: 0, detected: false };
  }

  async processFrame(frame: any): Promise<DocumentCorners | null> {
    if (!this.enabled || this.processing) return null;

    this.processing = true;
    try {
      // Accept precomputed corners injected by CameraEngine.detectLiveEdges to avoid double call
      let corners: DocumentCorners | null = frame?._precomputedCorners ?? null;
      if (!corners) corners = await nativeDetectDocumentEdges(frame);

      if (corners && corners.confidence > 0.3) {
        const stabilityScore = this.calculateStabilityScore(corners, this.lastCorners);
        this.previousCorners = this.lastCorners;
        this.lastCorners = corners;
        this.lastState = { corners, confidence: corners.confidence, stabilityScore, detected: true };
        this.emit({ type: 'edges_detected', corners });
        this.emit({ type: 'edge_state_changed', state: this.lastState });
      } else {
        this.lastState = { corners: null, confidence: 0, stabilityScore: 0, detected: false };
        this.emit({ type: 'edge_state_changed', state: this.lastState });
      }
      return corners;
    } catch (e) {
      this.emit({ type: 'error', error: { code: 'EDGE_DETECT_FAILED', message: 'Edge detection failed', recoverable: true } });
      return null;
    } finally {
      this.processing = false;
    }
  }

  /**
   * Post-capture corner detection via native OpenCV.
   * Returns null when native detection fails or confidence is too low —
   * callers should fall back to full-frame crop rather than using fake corners.
   */
  async analyzeCapture(uri: string, width: number, height: number): Promise<DocumentCorners | null> {
    const native = await nativeDetectDocumentEdges({ uri, width, height });
    if (native && native.confidence > 0.3) {
      this.lastCorners = native;
      return native;
    }
    return null;
  }

  getLastCorners(): DocumentCorners | null { return this.lastCorners; }
  getLastState(): EdgeDetectionState { return this.lastState; }

  private calculateStabilityScore(nextCorners: DocumentCorners, previousCorners: DocumentCorners | null): number {
    if (!previousCorners) return Math.max(0.25, nextCorners.confidence * 0.5);

    const points = [
      [nextCorners.topLeft,     previousCorners.topLeft],
      [nextCorners.topRight,    previousCorners.topRight],
      [nextCorners.bottomRight, previousCorners.bottomRight],
      [nextCorners.bottomLeft,  previousCorners.bottomLeft],
    ];

    const movement = points.reduce((sum, [current, previous]) => {
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      return sum + Math.sqrt(dx * dx + dy * dy);
    }, 0) / points.length;

    return Number((1 - Math.min(movement / 40, 1)).toFixed(3));
  }
}
