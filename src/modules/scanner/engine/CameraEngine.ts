import type { RefObject } from 'react';
import { CameraView } from 'expo-camera';
import { AutoCaptureReadiness, CaptureConfig, CaptureResult, DocumentCorners, EdgeDetectionState, ScannerListener, ScannerEvent } from '@/modules/scanner/types';
import { EdgeDetector } from '@/modules/scanner/engine/EdgeDetector';
import { AutoCaptureEngine } from '@/modules/scanner/engine/AutoCapture';
import { PerspectiveCorrector } from '@/modules/scanner/engine/PerspectiveCorrector';
import { Enhancer } from '@/modules/image-processing/core/Enhancer';
import { QualityAnalyzer } from '@/modules/image-processing/core/QualityAnalyzer';
import { nativeDetectDocumentEdges } from '@/modules/scanner/engine/NativeStub';
import { decideCapture, isMeaningfullyWorseCapture, STRICT_FALLBACK_POLICY } from '@/modules/scanner/engine/camera-capture-decision';
import { PreviewGeometryMapper } from '@/modules/scanner/engine/PreviewGeometryMapper';
import { checkLiveScanGate, checkCommitGate, checkDisplayGeometry } from '@/modules/scanner/engine/LiveScanGate';
import { LiveScanBridge } from '@/modules/scanner/engine/LiveScanBridge';
import type { LiveScanPayload } from '@/modules/scanner/engine/LiveScanBridge';
import { CornerCache } from '@/modules/scanner/engine/CornerCache';

const aspectForAutoCapture = (aspect?: number | null) => {
  if (typeof aspect !== 'number' || !Number.isFinite(aspect) || aspect <= 0.05) return 1;
  return Math.max(0, Math.min(aspect, 1));
};

const clamp01 = (value?: number | null, fallback = 0) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(value, 1));
};

export class CameraEngine {

  private cameraRef: RefObject<CameraView> | null = null;
  private edgeDetector: EdgeDetector;
  private autoCapture: AutoCaptureEngine;
  private perspectiveCorrector: PerspectiveCorrector;
  private enhancer: Enhancer;
  private qualityAnalyzer: QualityAnalyzer;
  private listeners: ScannerListener[] = [];

  private lastEdgeState: EdgeDetectionState = {
    corners: null,
    confidence: 0,
    stabilityScore: 0,
    detected: false,
  };

  private cornerCache = new CornerCache();

  private lastAutoCaptureReadiness: AutoCaptureReadiness = {
    score: 0,
    motionConfidence: 0,
    edgeConfidence: 0,
    blurScore: 1,
    brightnessScore: 1,
    distortionScore: 1,
    stable: false,
    ready: false,
    countdownProgress: 0,
  };

  private config: CaptureConfig = {
    autoCapture: false,
    flash: 'off',
    exposure: 0,
    filter: 'original',
    enableEdgeDetection: false,
    enablePerspectiveCorrection: false,
  };

  private isCapturing = false;
  private prevRawCorners: DocumentCorners | null = null;
  private geometry = new PreviewGeometryMapper();
  private bridge = new LiveScanBridge();
  private lastCommitGatePassed = false;
  private lastCommitGateTs = 0;
  private lastCommittedCorners: DocumentCorners | null = null;
  private lastCommittedCornersTs = 0;
  // Require consecutive passes before emitting edges_detected to prevent isolated ghost frames
  // (single PASS frames surrounded by FAILs) from briefly re-opening the polygon overlay.
  private consecutiveLivePassCount = 0;

  constructor() {
    this.edgeDetector = new EdgeDetector();
    this.autoCapture = new AutoCaptureEngine();
    this.perspectiveCorrector = new PerspectiveCorrector();
    this.enhancer = new Enhancer();
    this.qualityAnalyzer = new QualityAnalyzer();

    this.edgeDetector.addListener((e) => {
      if (e.type === 'edge_state_changed') {
        this.autoCapture.updateEdgeConfidence(e.state.confidence);
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

  setViewDimensions(w: number, h: number) {
    this.geometry.setViewDimensions(w, h);
  }

  addListener(listener: ScannerListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(event: ScannerEvent) {
    this.listeners.forEach(l => {
      try {
        l(event);
      } catch (e) {
        console.error('Camera engine listener error:', e);
      }
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

  async capture(): Promise<CaptureResult | null> {
    if (this.isCapturing) return null;
    this.isCapturing = true;

    if (__DEV__) console.log('[ScannerCapture] start');

    try {
      this.autoCapture.triggerFeedback();

      let photo: { uri: string; width: number; height: number };

      const nativePhoto = this.bridge.isAvailable ? await this.bridge.takePhoto() : null;
      if (nativePhoto) {
        if (__DEV__) console.log('[ScannerCapture] using native takePhoto');
        photo = nativePhoto;
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

      const committedBaseline = this.getRecentCommittedCorners();
      let captureCornersSource: 'photo' | 'video' = 'photo';
      let captureCorners = await nativeDetectDocumentEdges({ uri: originalUri }).catch(() => null);
      let hasRealDetection = captureCorners !== null;

      if (!captureCorners || captureCorners.confidence < STRICT_FALLBACK_POLICY.minConfidence) {
        const cached = this.cornerCache.captureCorners;
        if (cached) {
          captureCorners = cached.corners;
          hasRealDetection = true;
          captureCornersSource = 'video';
        }
      }

      if (committedBaseline && isMeaningfullyWorseCapture(captureCorners, committedBaseline)) {
        if (__DEV__) console.log('[ScannerCapture] using committed baseline instead of weaker still detection');
        captureCorners = committedBaseline;
        hasRealDetection = true;
        captureCornersSource = 'video';
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
          error: {
            code: 'DOCUMENT_NOT_READY',
            message: 'Dokument nicht stabil erkannt.',
            recoverable: true,
          },
        });
        return null;
      }

      if (this.config.enablePerspectiveCorrection && captureCorners.confidence >= 0.4) {
        if (captureCornersSource === 'video') {
          // Live-stream corners are normalized against the preview/video frame,
          // so they must be remapped into still-photo space before correction.
          const VIDEO_FRAME_W = 1080;
          const VIDEO_FRAME_H = 1920;
          correctedUri = await this.perspectiveCorrector.correct(
            originalUri, captureCorners, photo.width, photo.height, VIDEO_FRAME_W, VIDEO_FRAME_H,
          );
        } else {
          // Still-photo detection already runs on the captured image itself.
          // Passing video dimensions here would double-remap otherwise-correct corners.
          correctedUri = await this.perspectiveCorrector.correct(
            originalUri, captureCorners, photo.width, photo.height,
          );
        }
        corrected = correctedUri !== originalUri;
        finalUri = correctedUri;
      }

      const enhancePreset = this.config.filter === 'original' ? 'clean' : this.config.filter;
      const enhancementResult = await this.enhancer.enhance(finalUri, enhancePreset);
      enhancedUri = enhancementResult.applied ? enhancementResult.uri : undefined;
      finalUri = enhancementResult.uri;

      const A4_W = 2480;
      const A4_H = 3508;
      const qualityMetrics = await this.qualityAnalyzer.analyze(finalUri, A4_W, A4_H);

      const blurNorm = Math.min(1, qualityMetrics.blurScore / 100);
      const brightnessNorm = Math.min(1, qualityMetrics.brightnessScore / 100);

      this.autoCapture.updateQualityScores(
        blurNorm,
        brightnessNorm,
        1.0,                                   // distortion — no real metric available
        captureCorners.centerScore ?? 1,
        aspectForAutoCapture(captureCorners.aspectScore),
      );

      const result: CaptureResult = {
        uri: finalUri,
        originalUri,
        correctedUri,
        enhancedUri,
        finalUri,
        width: photo.width,
        height: photo.height,
        corners: captureCorners,
        corrected,
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
        error: {
          code: 'CAPTURE_FAILED',
          message: e.message || 'Failed to capture photo',
          recoverable: true,
        },
      });
      return null;
    } finally {
      this.isCapturing = false;
    }
  }

  async autoCapturePhoto() {
    if (!this.config.autoCapture) return;
    // Guard: last live frame must have passed commit gate AND been recent (< 800ms ago).
    // Prevents stale-trigger: countdown filled on good frame, capture fires after scene changed.
    const commitAge = Date.now() - this.lastCommitGateTs;
    if (!this.lastCommitGatePassed || commitAge > 800) {
      if (__DEV__) console.log('[AutoCapture] aborted — commit gate stale (passed=' + String(this.lastCommitGatePassed) + ' age=' + commitAge + 'ms)');
      this.autoCapture.updateEdgeConfidence(0);
      return;
    }
    await this.capture();
  }

  private getRecentCommittedCorners(maxAgeMs = 1200): DocumentCorners | null {
    if (!this.lastCommittedCorners || this.lastCommittedCornersTs === 0) return null;
    const age = Date.now() - this.lastCommittedCornersTs;
    return age <= maxAgeMs ? this.lastCommittedCorners : null;
  }

  lockManualCapture() {
    this.autoCapture.lockAfterManualCapture();
  }

  processFrame(frame: any) {
    if (this.config.enableEdgeDetection) {
      this.edgeDetector.processFrame(frame);
    }
  }

  get edgeState() {
    return this.lastEdgeState;
  }

  get autoCaptureReadiness() {
    return this.lastAutoCaptureReadiness;
  }

  private computeRawStability(current: DocumentCorners): number {
    if (!this.prevRawCorners) return 0.85;

    const pts: Array<[{ x: number; y: number }, { x: number; y: number }]> = [
      [current.topLeft, this.prevRawCorners.topLeft],
      [current.topRight, this.prevRawCorners.topRight],
      [current.bottomRight, this.prevRawCorners.bottomRight],
      [current.bottomLeft, this.prevRawCorners.bottomLeft],
    ];

    const movement = pts.reduce((sum, [c, p]) => {
      const dx = c.x - p.x;
      const dy = c.y - p.y;
      return sum + Math.sqrt(dx * dx + dy * dy);
    }, 0) / pts.length;

    return Math.max(0, 1 - movement / 0.12);
  }

  startLiveEdgeDetection(_intervalMs = 900) {
    this.stopLiveEdgeDetection();

    if (this.bridge.isAvailable) {
      if (__DEV__) console.log('[ScannerLive] using native AVCapture stream');
      this.bridge.start((payload) => this.handleNativeScanResult(payload));
    } else {
      if (__DEV__) console.log('[ScannerLive] native stream unavailable');
    }
  }

  stopLiveEdgeDetection() {
    this.bridge.stop();
  }

  private handleNativeScanResult({ corners, bufferW, bufferH }: LiveScanPayload) {
    if (this.isCapturing) return;

    const gate = checkLiveScanGate(corners);

    if (__DEV__) {
      const ts = Date.now() % 100000;
      const gateTag = gate.pass ? 'PASS' : ('FAIL:' + gate.reason);
      console.log(
        '[ScannerLive] t=' + ts
        + ' gate=' + gateTag
        + ' conf=' + (corners.confidence?.toFixed(3) ?? 'null')
        + ' edgeSupp=' + (corners.edgeSupportScore?.toFixed(3) ?? '-')
        + ' area=' + (corners.areaScore?.toFixed(3) ?? '-')
        + ' angle=' + (corners.angleScore?.toFixed(3) ?? '-')
        + ' aspect=' + (corners.aspectScore?.toFixed(3) ?? '-')
        + ' center=' + (corners.centerScore?.toFixed(3) ?? '-'),
      );
    }

    if (gate.pass) {
      this.cornerCache.onFrameAccepted(corners);

      const motionStability = this.computeRawStability(corners);
      this.prevRawCorners = corners;

      // Separate display gate (LIVE_GATE, already passed) from commit gate (COMMIT_GATE).
      // Auto-capture countdown only runs when the polygon is tight and the device is still.
      const commit = checkCommitGate(corners, motionStability);
      this.lastCommitGatePassed = commit.pass;
      if (commit.pass) {
        const now = Date.now();
        this.lastCommitGateTs = now;
        this.lastCommittedCorners = corners;
        this.lastCommittedCornersTs = now;
      }
      if (commit.pass) {
        this.autoCapture.updateEdgeConfidence(corners.confidence);
        this.autoCapture.updateQualityScores(
          1.0,
          1.0,
          1.0,
          corners.centerScore ?? 1,
          aspectForAutoCapture(corners.aspectScore),
        );
      } else {
        this.autoCapture.updateEdgeConfidence(0);
        if (__DEV__) console.log('[ScannerCommit] suppressed — ' + commit.reason);
      }

      const rawDisplay = this.geometry.mapToDisplay(corners, bufferW, bufferH);
      if (!rawDisplay) {
        this.consecutiveLivePassCount = 0;
        if (__DEV__) console.log('[ScannerLiveEmit] rejecting frame: view dimensions unknown');
        return;
      }

      if (!checkDisplayGeometry(rawDisplay)) {
        this.consecutiveLivePassCount = 0;
        this.autoCapture.updateEdgeConfidence(0);
        this.geometry.resetSmoothing();
        this.lastEdgeState = {
          corners: null,
          confidence: 0,
          stabilityScore: 0,
          detected: false,
        };
        if (__DEV__) console.log('[ScannerLiveEmit] rejecting frame: displayGeometry invalid');
        this.emit({ type: 'edge_state_changed', state: this.lastEdgeState });
        return;
      }

      this.consecutiveLivePassCount++;

      const prev = this.geometry.currentSmoothed;
      const prevArea = prev?.areaScore ?? 0;
      const prevConf = prev?.confidence ?? 0;
      const newArea = corners.areaScore ?? 0;
      const newConf = corners.confidence;
      const locked = prevArea >= 0.55 && prevConf >= 0.68;
      const regressed = newArea < prevArea - 0.30 && newConf < prevConf - 0.10;
      const emaAlpha = locked && regressed ? 0.05 : 0.35;

      const displayCorners = this.geometry.smooth(rawDisplay, emaAlpha);

      const detectedState: EdgeDetectionState = {
        corners: displayCorners,
        confidence: corners.confidence,
        stabilityScore: motionStability,
        detected: true,
      };

      this.lastEdgeState = detectedState;

      if (__DEV__) console.log('[ScannerLiveEmit] emitting detected=true conf=' + detectedState.confidence.toFixed(3));

      // Require 2 consecutive PASS frames before showing the polygon overlay.
      // Isolated single-frame PASSes surrounded by FAILs are ghost detections — the native
      // quad detector occasionally finds a partial edge in an otherwise-moving/empty frame.
      if (this.consecutiveLivePassCount >= 2) {
        this.emit({ type: 'edges_detected', corners: displayCorners });
      }
      this.emit({ type: 'edge_state_changed', state: detectedState });
      return;
    }

    this.consecutiveLivePassCount = 0;
    this.lastCommitGatePassed = false;
    this.lastCommitGateTs = 0;
    this.lastCommittedCorners = null;
    this.lastCommittedCornersTs = 0;
    this.autoCapture.updateEdgeConfidence(0);
    this.geometry.resetSmoothing();

    this.cornerCache.onFrameRejected();

    const clearedState: EdgeDetectionState = {
      corners: null,
      confidence: 0,
      stabilityScore: 0,
      detected: false,
    };
    this.lastEdgeState = clearedState;

    if (__DEV__) console.log('[ScannerLiveEmit] emitting detected=false');
    this.emit({ type: 'edge_state_changed', state: clearedState });
  }

  dispose() {
    this.stopLiveEdgeDetection();
    this.autoCapture.stop();
    this.cornerCache.reset();
    this.geometry.resetSmoothing();
    this.prevRawCorners = null;
    this.consecutiveLivePassCount = 0;
    this.lastCommitGatePassed = false;
    this.lastCommitGateTs = 0;
    this.lastCommittedCorners = null;
    this.lastCommittedCornersTs = 0;
    this.listeners = [];
  }
}
