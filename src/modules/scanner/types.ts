export interface Point {
  x: number;
  y: number;
}

export interface DocumentCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
  confidence: number;
}

export interface CaptureConfig {
  autoCapture: boolean;
  flash: 'off' | 'on';
  exposure: number;
  filter: string;
  enableEdgeDetection: boolean;
  enablePerspectiveCorrection: boolean;
}

export interface ScannerQualityMetrics {
  blurScore: number;
  contrastScore: number;
  brightnessScore: number;
  sharpnessScore: number;
  overallScore: number;
}

export interface CaptureProcessingMetadata {
  filter: string;
  perspectiveCorrectionApplied: boolean;
  enhancementApplied: boolean;
  qualityAnalyzed: boolean;
}

export interface CaptureResult {
  uri: string;
  originalUri: string;
  correctedUri?: string;
  enhancedUri?: string;
  finalUri: string;
  width: number;
  height: number;
  corners?: DocumentCorners;
  corrected?: boolean;
  filterApplied?: string;
  qualityMetrics?: ScannerQualityMetrics;
  processing: CaptureProcessingMetadata;
  timestamp: number;
}

export interface StabilityState {
  isStable: boolean;
  stabilityDuration: number;
  confidence: number;
}

export interface EdgeDetectionState {
  corners: DocumentCorners | null;
  confidence: number;
  stabilityScore: number;
  detected: boolean;
}

export interface AutoCaptureReadiness {
  score: number;
  motionConfidence: number;
  edgeConfidence: number;
  blurScore: number;
  brightnessScore: number;
  distortionScore: number;
  stable: boolean;
  ready: boolean;
}

export interface ScannerError {
  code: string;
  message: string;
  recoverable: boolean;
  retry?: () => Promise<void>;
}

export type ScannerEvent =
  | { type: 'edges_detected'; corners: DocumentCorners }
  | { type: 'edge_state_changed'; state: EdgeDetectionState }
  | { type: 'stability_changed'; state: StabilityState }
  | { type: 'auto_capture_ready'; readiness: AutoCaptureReadiness }
  | { type: 'capture_ready' }
  | { type: 'capture_complete'; result: CaptureResult }
  | { type: 'error'; error: ScannerError };

export interface ScannerListener {
  (event: ScannerEvent): void;
}

export type ScannerMode =
  | 'wählen'
  | 'kamera'
  | 'qr'
  | 'analysieren'
  | 'ergebnis'
  | 'fehler';

export interface ScannerPage {
  uri: string;
}

export interface ScanQualityInput {
  uri: string;
  width: number;
  height: number;
}

export interface ScanQualityAnalysis {
  width: number;
  height: number;
  fileSize: number | null;
  isLowResolution: boolean;
  isLikelyBlurred: boolean;
  isAcceptable: boolean;
  reason: string | null;
}

export interface OcrPageResult {
  uri: string;
  text: string;
  confidence: number | null;
}

export interface OcrBatchResult {
  text: string;
  confidence: number | null;
  pages: OcrPageResult[];
}
