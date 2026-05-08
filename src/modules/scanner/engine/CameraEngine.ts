import type { RefObject } from 'react';
import { CameraView } from 'expo-camera';
import { Dimensions, NativeModules, NativeEventEmitter } from 'react-native';
import { AutoCaptureReadiness, CaptureConfig, CaptureResult, DocumentCorners, EdgeDetectionState, ScannerListener, ScannerEvent } from '@/modules/scanner/types';
import { EdgeDetector } from '@/modules/scanner/engine/EdgeDetector';
import { AutoCaptureEngine } from '@/modules/scanner/engine/AutoCapture';
import { PerspectiveCorrector } from '@/modules/scanner/engine/PerspectiveCorrector';
import { Enhancer } from '@/modules/image-processing/core/Enhancer';
import { QualityAnalyzer } from '@/modules/image-processing/core/QualityAnalyzer';
import { nativeDetectDocumentEdges } from '@/modules/scanner/engine/NativeStub';
import { decideCapture, STRICT_FALLBACK_POLICY } from '@/modules/scanner/engine/camera-capture-decision';
import { resetLiveState, updateLiveState } from '@/modules/scanner/engine/camera-live-state';

const LiveScanNative = NativeModules.BriefPilotLiveScanModule as {
  takePhoto: () => Promise<{ uri: string; width: number; height: number }>;
  startLiveDetection: () => void;
  stopLiveDetection: () => void;
} | undefined;

const LiveScanEmitter = LiveScanNative
  ? new NativeEventEmitter(NativeModules.BriefPilotLiveScanModule)
  : null;

export class CameraEngine {
  private static readonly LAST_GOOD_WINDOW_MS = 1800;
  private static readonly LAST_GOOD_CONFIDENCE_MIN = 0.55;
  private static readonly LAST_GOOD_AREA_MIN = 0.10;
  private static readonly LAST_GOOD_ANGLE_MIN = 0.70;
  private cameraRef: RefObject<CameraView> | null = null;
  private edgeDetector: EdgeDetector;
  private autoCapture: AutoCaptureEngine;
  private perspectiveCorrector: PerspectiveCorrector;
  private enhancer: Enhancer;
  private qualityAnalyzer: QualityAnalyzer;
  private listeners: ScannerListener[] = [];
  private lastEdgeState: EdgeDetectionState = {
    corners: null, confidence: 0, stabilityScore: 0, detected: false,
  };
  private lastCaptureNormalizedCorners: DocumentCorners | null = null;
  private lastGoodCaptureNormalizedCorners: DocumentCorners | null = null;
  private lastGoodConfidence = 0;
  private lastAutoCaptureReadiness: AutoCaptureReadiness = {
    score: 0, motionConfidence: 0, edgeConfidence: 0,
    blurScore: 1, brightnessScore: 1, distortionScore: 1,
    stable: false, ready: false, countdownProgress: 0,
  };
  private config: CaptureConfig = {
    autoCapture: false, flash: 'off', exposure: 0,
    filter: 'original', enableEdgeDetection: false, enablePerspectiveCorrection: false,
  };
  private isCapturing = false;
  private liveScanSubscription: any = null;
  private lastCornersTimestamp = 0;
  private lastGoodCornersTimestamp = 0;
  private smoothedDisplayCorners: DocumentCorners | null = null;
  private prevRawCorners: DocumentCorners | null = null;
  private static readonly DISPLAY_SMOOTH_ALPHA = 0.35;

  constructor() {
    this.edgeDetector = new EdgeDetector();
    this.autoCapture = new AutoCaptureEngine();
    this.perspectiveCorrector = new PerspectiveCorrector();
    this.enhancer = new Enhancer();
    this.qualityAnalyzer = new QualityAnalyzer();

    this.edgeDetector.addListener((e) => {
      if (e.type === 'edge_state_changed') {
        this.autoCapture.updateEdgeConfidence(e.state.confidence * e.state.stabilityScore);
        return;
      }
      if (e.type === 'edges_detected') return;
      this.emit(e);
    });
    this.autoCapture.addListener((e) => {
      if (e.type === 'auto_capture_ready') {
        this.lastAutoCaptureReadiness = e.readiness;
      }
      this.emit(e);
      if (e.type === 'capture_ready' && this.config.autoCapture) {
        this.autoCapturePhoto();
      }
    });
  }

  setCameraRef(ref: RefObject<CameraView>) {
    this.cameraRef = ref;
  }

  addListener(listener: ScannerListener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private emit(event: ScannerEvent) {
    this.listeners.forEach(l => {
      try { l(event); } catch (e) { console.error('Camera engine listener error:', e); }
    });
  }

  updateConfig(config: Partial<CaptureConfig>) {
    this.config = { ...this.config, ...config };
    if (config.enableEdgeDetection !== undefined) {
      config.enableEdgeDetection ? this.edgeDetector.enable() : this.edgeDetector.disable();
    }
    if (config.autoCapture !== undefined) {
      config.autoCapture ? this.autoCapture.start() : this.autoCapture.stop();
    }
  }

  // ─── Capture ───────────────────────────────────────────────────────────────

  async capture(): Promise<CaptureResult | null> {
    if (this.isCapturing) return null;
    this.isCapturing = true;
    if (__DEV__) console.log('[ScannerCapture] start');

    try {
      this.autoCapture.triggerFeedback();

      // Use native live scanner if available, fall back to Expo Camera
      let photo: { uri: string; width: number; height: number };
      if (LiveScanNative) {
        if (__DEV__) console.log('[ScannerCapture] using native takePhoto');
        photo = await LiveScanNative.takePhoto();
      } else {
        if (!this.cameraRef?.current) return null;
        if (__DEV__) console.log('[ScannerCapture] using ExpoCameraRef takePhoto');
        const p = await (this.cameraRef.current as any).takePictureAsync({ quality: 1 });
        photo = { uri: p.uri, width: p.width, height: p.height };
      }

      const originalUri = photo.uri;
      let correctedUri: string | undefined;
      let enhancedUri: string | undefined;
      let finalUri = originalUri;
      let corrected = false;

      let captureCorners = await nativeDetectDocumentEdges({ uri: originalUri }).catch(() => null);
      let hasRealDetection = captureCorners !== null;

      if (!captureCorners || captureCorners.confidence < STRICT_FALLBACK_POLICY.minConfidence) {
        const cornersAge = this.lastGoodCornersTimestamp > 0 ? Date.now() - this.lastGoodCornersTimestamp : -1;
        if (
          cornersAge >= 0 && cornersAge < CameraEngine.LAST_GOOD_WINDOW_MS &&
          this.lastGoodCaptureNormalizedCorners &&
          this.lastGoodConfidence >= CameraEngine.LAST_GOOD_CONFIDENCE_MIN
        ) {
          captureCorners = this.lastGoodCaptureNormalizedCorners;
          hasRealDetection = true;
        }
      }

      const captureDecision = decideCapture(hasRealDetection, captureCorners, STRICT_FALLBACK_POLICY);

      if (__DEV__) {
        console.log(
          '[ScannerCapture] decision=' + captureDecision.reason
          + ' conf=' + captureDecision.quality.confidence.toFixed(3)
          + ' area=' + captureDecision.quality.areaScore.toFixed(3)
          + ' angle=' + captureDecision.quality.angleScore.toFixed(3)
          + ' aspect=' + captureDecision.quality.aspectScore.toFixed(3)
          + ' center=' + captureDecision.quality.centerScore.toFixed(3),
        );
      }

      if (!captureDecision.shouldCapture || !captureCorners) {
        this.emit({
          type: 'error',
          error: { code: 'DOCUMENT_NOT_READY', message: 'Dokument nicht stabil erkannt.', recoverable: true },
        });
        return null;
      }

      if (this.config.enablePerspectiveCorrection && captureCorners.confidence >= 0.4) {
        correctedUri = await this.perspectiveCorrector.correct(originalUri, captureCorners, photo.width, photo.height);
        corrected = correctedUri !== originalUri;
        finalUri = correctedUri;
      }

      const enhancePreset = this.config.filter === 'original' ? 'clean' : this.config.filter;
      const enhancementResult = await this.enhancer.enhance(finalUri, enhancePreset);
      enhancedUri = enhancementResult.applied ? enhancementResult.uri : undefined;
      finalUri = enhancementResult.uri;

      const A4_W = 2480, A4_H = 3508;
      const qualityMetrics = await this.qualityAnalyzer.analyze(finalUri, A4_W, A4_H);

      const blurNorm = Math.min(1, qualityMetrics.blurScore / 100);
      const brightnessNorm = Math.min(1, qualityMetrics.brightnessScore / 100);
      this.autoCapture.updateQualityScores(blurNorm, brightnessNorm, captureCorners.confidence);

      const result: CaptureResult = {
        uri: finalUri, originalUri, correctedUri, enhancedUri, finalUri,
        width: photo.width, height: photo.height,
        corners: captureCorners, corrected,
        filterApplied: enhancementResult.applied ? enhancementResult.preset : undefined,
        qualityMetrics,
        processing: {
          filter: enhancementResult.preset,
          perspectiveCorrectionApplied: corrected,
          enhancementApplied: enhancementResult.applied,
          qualityAnalyzed: true,
        },
        timestamp: Date.now(),
      };

      this.emit({ type: 'capture_complete', result });
      return result;
    } catch (e: any) {
      if (__DEV__) console.log('[ScannerCapture] failureReason=' + (e?.message ?? 'unknown'));
      this.emit({
        type: 'error',
        error: { code: 'CAPTURE_FAILED', message: e.message || 'Failed to capture photo', recoverable: true },
      });
      return null;
    } finally {
      this.isCapturing = false;
    }
  }

  async autoCapturePhoto() {
    if (!this.config.autoCapture) return;
    await this.capture();
  }

  lockManualCapture() {
    this.autoCapture.lockAfterManualCapture();
  }

  processFrame(frame: any) {
    if (this.config.enableEdgeDetection) {
      this.edgeDetector.processFrame(frame);
    }
  }

  get edgeState() { return this.lastEdgeState; }
  get autoCaptureReadiness() { return this.lastAutoCaptureReadiness; }

  // ─── Coordinate transform ──────────────────────────────────────────────────

  private captureToPreviewCorners(
    corners: DocumentCorners,
    captureW: number,
    captureH: number,
  ): DocumentCorners {
    const { width: SW, height: SH } = Dimensions.get('window');
    const previewAspect = SW / SH;
    const captureAspect = captureW / captureH;

    const tr = (pt: { x: number; y: number }) => {
      if (captureAspect > previewAspect) {
        const pw = previewAspect / captureAspect;
        const xOff = (1 - pw) / 2;
        return { x: (pt.x - xOff) / pw, y: pt.y };
      }
      const ph = captureAspect / previewAspect;
      const yOff = (1 - ph) / 2;
      return { x: pt.x, y: (pt.y - yOff) / ph };
    };

    return {
      topLeft:     tr(corners.topLeft),
      topRight:    tr(corners.topRight),
      bottomRight: tr(corners.bottomRight),
      bottomLeft:  tr(corners.bottomLeft),
      confidence:  corners.confidence,
      areaScore:   corners.areaScore,
      angleScore:  corners.angleScore,
      aspectScore: corners.aspectScore,
      centerScore: corners.centerScore,
    };
  }

  private computeRawStability(current: DocumentCorners): number {
    if (!this.prevRawCorners) return 0.85;
    const pts: Array<[{ x: number; y: number }, { x: number; y: number }]> = [
      [current.topLeft,     this.prevRawCorners.topLeft],
      [current.topRight,    this.prevRawCorners.topRight],
      [current.bottomRight, this.prevRawCorners.bottomRight],
      [current.bottomLeft,  this.prevRawCorners.bottomLeft],
    ];
    const movement = pts.reduce((sum, [c, p]) => {
      const dx = c.x - p.x, dy = c.y - p.y;
      return sum + Math.sqrt(dx * dx + dy * dy);
    }, 0) / pts.length;
    return Math.max(0, 1 - movement / 0.12);
  }

  private smoothDisplayCorners(raw: DocumentCorners): DocumentCorners {
    if (!this.smoothedDisplayCorners) { this.smoothedDisplayCorners = raw; return raw; }
    const a = CameraEngine.DISPLAY_SMOOTH_ALPHA;
    const b = 1 - a;
    const lp = (r: number, p: number) => a * r + b * p;
    const prev = this.smoothedDisplayCorners;
    this.smoothedDisplayCorners = {
      ...raw,
      topLeft:     { x: lp(raw.topLeft.x,     prev.topLeft.x),     y: lp(raw.topLeft.y,     prev.topLeft.y) },
      topRight:    { x: lp(raw.topRight.x,    prev.topRight.x),    y: lp(raw.topRight.y,    prev.topRight.y) },
      bottomRight: { x: lp(raw.bottomRight.x, prev.bottomRight.x), y: lp(raw.bottomRight.y, prev.bottomRight.y) },
      bottomLeft:  { x: lp(raw.bottomLeft.x,  prev.bottomLeft.x),  y: lp(raw.bottomLeft.y,  prev.bottomLeft.y) },
    };
    return this.smoothedDisplayCorners;
  }

  // ─── Live detection (native stream) ────────────────────────────────────────

  startLiveEdgeDetection(_intervalMs = 900) {
    this.stopLiveEdgeDetection();
    if (LiveScanEmitter) {
      if (__DEV__) console.log('[ScannerLive] using native AVCapture stream');
      this.liveScanSubscription = LiveScanEmitter.addListener(
        'onLiveScanResult',
        (result) => this.handleNativeScanResult(result),
      );
    } else {
      if (__DEV__) console.log('[ScannerLive] native stream unavailable');
    }
  }

  stopLiveEdgeDetection() {
    this.liveScanSubscription?.remove();
    this.liveScanSubscription = null;
  }

  private handleNativeScanResult(native: any) {
    if (this.isCapturing) return;

    const corners: DocumentCorners = {
      topLeft:     native.topLeft,
      topRight:    native.topRight,
      bottomRight: native.bottomRight,
      bottomLeft:  native.bottomLeft,
      confidence:  native.confidence,
      areaScore:   native.areaScore,
      angleScore:  native.angleScore,
      aspectScore: native.aspectScore,
      centerScore: native.centerScore,
    };

    const W: number = native.width  ?? 720;
    const H: number = native.height ?? 1280;

    if (__DEV__) console.log(
      '[ScannerLive] conf=' + (corners.confidence?.toFixed(3) ?? 'null')
      + ' area=' + (corners.areaScore?.toFixed(3) ?? '-')
      + ' angle=' + (corners.angleScore?.toFixed(3) ?? '-')
      + ' center=' + (corners.centerScore?.toFixed(3) ?? '-'),
    );

    const qualityOk = corners !== null
      && corners.confidence >= 0.50
      && (corners.areaScore  ?? 1) >= 0.08
      && (corners.areaScore  ?? 0) <= 1.0
      && (corners.angleScore ?? 1) >= 0.60
      && (corners.centerScore ?? 1) >= 0.20;

    if (qualityOk) {
      this.lastCornersTimestamp = Date.now();
      this.lastCaptureNormalizedCorners = corners;
      if (
        corners.confidence >= CameraEngine.LAST_GOOD_CONFIDENCE_MIN &&
        (corners.areaScore ?? 0) >= CameraEngine.LAST_GOOD_AREA_MIN &&
        (corners.angleScore ?? 0) >= CameraEngine.LAST_GOOD_ANGLE_MIN
      ) {
        this.lastGoodCornersTimestamp = this.lastCornersTimestamp;
        this.lastGoodCaptureNormalizedCorners = corners;
        this.lastGoodConfidence = corners.confidence;
      }

      // Stability from raw (pre-smooth) corner movement — avoids double-EMA artefact
      const motionStability = this.computeRawStability(corners);
      this.prevRawCorners = corners;
      this.autoCapture.updateEdgeConfidence(corners.confidence * motionStability);

      const rawDisplay = this.captureToPreviewCorners(corners, W, H);
      const displayCorners = this.smoothDisplayCorners(rawDisplay);
      updateLiveState(
        { corners: displayCorners, confidence: corners.confidence, stabilityScore: motionStability, detected: true },
        Date.now(),
      );

      const liveState: EdgeDetectionState = {
        corners: displayCorners,
        confidence: corners.confidence,
        stabilityScore: motionStability,
        detected: true,
      };
      this.lastEdgeState = liveState;

      if (__DEV__) console.log('[ScannerLiveEmit] emitting detected=true conf=' + liveState.confidence.toFixed(3));
      this.emit({ type: 'edges_detected', corners: displayCorners });
      this.emit({ type: 'edge_state_changed', state: liveState });
    } else {
      const msSinceGood = this.lastCornersTimestamp > 0
        ? Date.now() - this.lastCornersTimestamp
        : Infinity;
      if (msSinceGood > 2000) {
        this.autoCapture.updateEdgeConfidence(0);
      }
      const now = Date.now();
      const stabilizedState = updateLiveState(
        { corners: null, confidence: 0, stabilityScore: 0, detected: false },
        now,
      );
      this.lastEdgeState = stabilizedState;
      if (this.lastGoodCornersTimestamp > 0 && (now - this.lastGoodCornersTimestamp) > 3000) {
        this.lastGoodCornersTimestamp = 0;
        this.lastGoodCaptureNormalizedCorners = null;
        this.lastGoodConfidence = 0;
      }
      if (__DEV__) console.log('[ScannerLiveEmit] emitting detected=' + String(stabilizedState.detected));
      this.emit({ type: 'edge_state_changed', state: stabilizedState });
    }
  }

  dispose() {
    this.stopLiveEdgeDetection();
    this.autoCapture.stop();
    this.lastCaptureNormalizedCorners = null;
    this.lastGoodCaptureNormalizedCorners = null;
    this.lastGoodConfidence = 0;
    this.lastCornersTimestamp = 0;
    this.lastGoodCornersTimestamp = 0;
    this.smoothedDisplayCorners = null;
    this.prevRawCorners = null;
    resetLiveState();
    this.listeners = [];
  }
}
