import { DocumentCorners, EdgeDetectionState, ScannerListener, ScannerEvent } from '../types';
import { nativeDetectDocumentEdges } from './NativeStub';

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
      let corners = await nativeDetectDocumentEdges(frame);
      if (!corners) corners = null; // JS frame-level fallback not practical — use analyzeCapture instead

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
   * Post-capture quadrilateral detection using image geometry heuristics.
   * Returns normalized (0-1) corner coordinates. Confidence reflects how
   * document-like the aspect ratio and dimensions are.
   * Native OpenCV wiring goes in NativeStub — this is the pure-JS fallback.
   */
  async analyzeCapture(uri: string, width: number, height: number): Promise<DocumentCorners> {
    // Try native path first (will return null until native module wired)
    const native = await nativeDetectDocumentEdges({ uri, width, height });
    if (native && native.confidence > 0.3) {
      this.lastCorners = native;
      return native;
    }

    // JS heuristic: score the image by its aspect ratio proximity to A4/Letter
    const aspectRatio = height / width;
    const a4Ratio = 1.414; // height/width for portrait A4
    const letterRatio = 1.294; // height/width for portrait Letter
    const a4Distance = Math.abs(aspectRatio - a4Ratio) / a4Ratio;
    const letterDistance = Math.abs(aspectRatio - letterRatio) / letterRatio;
    const bestDistance = Math.min(a4Distance, letterDistance);

    // High confidence if aspect ratio is within 15% of A4/Letter
    const ratioConfidence = Math.max(0.3, 1 - bestDistance * 3);

    // Resolution bonus: higher res = more likely a real document scan
    const resBonus = Math.min(0.15, (Math.min(width, height) - 800) / 20000);

    // Conservative inset: assume document fills ~90% of frame
    const inset = 0.05;
    const confidence = Math.min(0.85, ratioConfidence + resBonus);

    const corners: DocumentCorners = {
      topLeft:     { x: inset,       y: inset },
      topRight:    { x: 1 - inset,   y: inset },
      bottomRight: { x: 1 - inset,   y: 1 - inset },
      bottomLeft:  { x: inset,       y: 1 - inset },
      confidence,
    };

    this.lastCorners = corners;
    return corners;
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
