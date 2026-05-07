import type { RefObject } from 'react';
import { CameraView } from 'expo-camera';
import { Dimensions } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { AutoCaptureReadiness, CaptureConfig, CaptureResult, DocumentCorners, EdgeDetectionState, ScannerListener, ScannerEvent } from '@/modules/scanner/types';
import { EdgeDetector } from '@/modules/scanner/engine/EdgeDetector';
import { AutoCaptureEngine } from '@/modules/scanner/engine/AutoCapture';
import { PerspectiveCorrector } from '@/modules/scanner/engine/PerspectiveCorrector';
import { Enhancer } from '@/modules/image-processing/core/Enhancer';
import { QualityAnalyzer } from '@/modules/image-processing/core/QualityAnalyzer';
import { nativeDetectDocumentEdges } from '@/modules/scanner/engine/NativeStub';

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
  // Capture-normalized corners (from live detection) retained for warpPerspective fallback.
  // Separate from lastEdgeState.corners which hold display-transformed coords.
  private lastCaptureNormalizedCorners: DocumentCorners | null = null;
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
  private liveDetectTimer: ReturnType<typeof setInterval> | null = null;
  private liveDetectRunning = false;
  private liveDetectIntervalMs = 900;
  private lastCornersTimestamp = 0;

  constructor() {
    this.edgeDetector = new EdgeDetector();
    this.autoCapture = new AutoCaptureEngine();
    this.perspectiveCorrector = new PerspectiveCorrector();
    this.enhancer = new Enhancer();
    this.qualityAnalyzer = new QualityAnalyzer();

    this.edgeDetector.addListener((e) => {
      if (e.type === 'edge_state_changed') {
        this.lastEdgeState = e.state;
        this.autoCapture.updateEdgeConfidence(e.state.confidence * e.state.stabilityScore);
      }
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
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
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
      if (config.autoCapture) {
        this.autoCapture.start();
      } else {
        this.autoCapture.stop();
      }
    }
  }

  async capture(): Promise<CaptureResult | null> {
    if (!this.cameraRef?.current || this.isCapturing) return null;

    this.isCapturing = true;
    if (__DEV__) console.log('[ScannerCapture] start');
    try {
      // Wait for any in-progress live-detect snapshot to finish before calling
      // takePictureAsync — concurrent calls from detectLiveEdges cause capture errors.
      if (this.liveDetectRunning) {
        if (__DEV__) console.log('[ScannerCapture] waiting for live detect snapshot');
        await new Promise<void>((resolve) => {
          const poll = setInterval(() => {
            if (!this.liveDetectRunning) { clearInterval(poll); resolve(); }
          }, 30);
          setTimeout(() => { clearInterval(poll); resolve(); }, 1500);
        });
      }
      this.autoCapture.triggerFeedback();

      const photo = await this.cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: false,
      });

      const originalUri = photo.uri;
      let correctedUri: string | undefined;
      let enhancedUri: string | undefined;
      let finalUri = originalUri;
      let corrected = false;

      // Köşe tespiti: native OpenCV → guide frame fallback
      let captureCorners = await nativeDetectDocumentEdges({ uri: originalUri })
        .catch(() => null);

      if (!captureCorners || captureCorners.confidence < 0.35) {
        const cornersAge = this.lastCornersTimestamp > 0 ? Date.now() - this.lastCornersTimestamp : -1;
        // Full-res photos (4032px → 900px in OpenCV) lose edge quality.
        // If live detection found corners recently and the phone is held still
        // (auto-capture requires stability), those coords are still valid.
        // Use capture-normalized corners (not display-transformed) for warpPerspective.
        if (cornersAge >= 0 && cornersAge < 15000 && this.lastCaptureNormalizedCorners && this.lastCaptureNormalizedCorners.confidence >= 0.35) {
          if (__DEV__) console.log('[ScannerCapture] liveCornersFallback cornersAge=' + cornersAge + 'ms conf=' + this.lastCaptureNormalizedCorners.confidence.toFixed(3));
          captureCorners = this.lastCaptureNormalizedCorners;
        } else {
          if (__DEV__) console.log('[ScannerCapture] guideFallbackUsed=true latestCornersAgeMs=' + cornersAge);
          captureCorners = this.computeGuideCropCorners(photo.width, photo.height);
        }
      }

      if (this.config.enablePerspectiveCorrection && captureCorners.confidence >= 0.4) {
        correctedUri = await this.perspectiveCorrector.correct(originalUri, captureCorners, photo.width, photo.height);
        corrected = correctedUri !== originalUri;
        finalUri = correctedUri;
      }

      // Always enhance with 'clean' so native contrast/brightness boost runs automatically.
      // If the user has explicitly chosen a filter, honour it; 'original' is never used
      // as the auto-preset because it skips all enhancement steps.
      const enhancePreset = this.config.filter === 'original' ? 'clean' : this.config.filter;
      const enhancementResult = await this.enhancer.enhance(finalUri, enhancePreset);
      enhancedUri = enhancementResult.applied ? enhancementResult.uri : undefined;
      finalUri = enhancementResult.uri;

      // Pass the A4 output dimensions (from PerspectiveCorrector) to the quality
      // analyser so it can use the bytes/megapixel metric instead of raw file size.
      const A4_W = 2480, A4_H = 3508;
      const qualityMetrics = await this.qualityAnalyzer.analyze(finalUri, A4_W, A4_H);

      // Feed quality data back into AutoCapture scoring
      const blurNorm = Math.min(1, qualityMetrics.blurScore / 100);
      const brightnessNorm = Math.min(1, qualityMetrics.brightnessScore / 100);
      const distortionNorm = captureCorners.confidence;
      this.autoCapture.updateQualityScores(blurNorm, brightnessNorm, distortionNorm);

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
          retry: async () => { await this.capture(); },
        },
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

  /** One-shot lock nach manueller Aufnahme — verhindert sofortige Re-Arm. */
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

  /**
   * Maps the guide frame (visual overlay on preview) into normalized capture-image
   * coordinates, accounting for the preview-to-sensor crop difference.
   *
   * The preview shows a center-crop of the capture: portrait phones typically use
   * a 9:16 preview while the sensor captures at 3:4, so ~21% of the capture width
   * falls outside the visible preview area on each side.
   *
   * Guide frame constants must match styles/dimensions.ts:
   *   width = 72% of screen, centered; top = 10%; height = width × 1.414 (A4).
   */
  private computeGuideCropCorners(captureW: number, captureH: number): DocumentCorners {
    const { width: SW, height: SH } = Dimensions.get('window');

    const GUIDE_RATIO  = 0.72;
    const GUIDE_W_PTS  = SW * GUIDE_RATIO;
    const GUIDE_H_PTS  = GUIDE_W_PTS * 1.414; // A4 aspect ratio

    // Guide in preview-normalized space (0-1)
    const prevL = (1 - GUIDE_RATIO) / 2;          // 0.025
    const prevR = 1 - prevL;                       // 0.975
    const prevT = 0.10;
    const prevB = prevT + GUIDE_H_PTS / SH;

    // The preview is a center-crop of the capture image.
    const previewAspect = SW / SH;
    const captureAspect = captureW / captureH;

    let cL: number, cR: number, cT: number, cB: number;

    if (captureAspect > previewAspect) {
      // Capture wider than preview → horizontal margins outside preview
      const pw  = previewAspect / captureAspect;
      const xOff = (1 - pw) / 2;
      cL = xOff + prevL * pw;
      cR = xOff + prevR * pw;
      cT = prevT;
      cB = prevB;
    } else {
      // Capture taller than preview → vertical margins outside preview
      const ph   = captureAspect / previewAspect;
      const yOff = (1 - ph) / 2;
      cL = prevL;
      cR = prevR;
      cT = yOff + prevT * ph;
      cB = yOff + prevB * ph;
    }

    return {
      topLeft:     { x: cL, y: cT },
      topRight:    { x: cR, y: cT },
      bottomRight: { x: cR, y: cB },
      bottomLeft:  { x: cL, y: cB },
      confidence:  0.82, // guide-frame crop: deterministic, not a heuristic
    };
  }

  /**
   * Maps corners from capture-normalized space (relative to the sensor image, e.g. 3:4)
   * to preview-normalized space (relative to the screen, e.g. 9:16).
   *
   * The Expo Camera preview displays a center-crop of the sensor capture. OpenCV returns
   * corners normalized to the sensor image; DocumentOverlay expects preview coordinates.
   * Without this transform the polygon appears shifted and the wrong size.
   */
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
        // Sensor wider than preview → left/right strips hidden in preview
        const pw = previewAspect / captureAspect;
        const xOff = (1 - pw) / 2;
        return { x: (pt.x - xOff) / pw, y: pt.y };
      }
      // Sensor taller than preview → top/bottom strips hidden in preview
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
    };
  }

  startLiveEdgeDetection(intervalMs = 900) {
    this.liveDetectIntervalMs = intervalMs;
    this.stopLiveEdgeDetection();
    this.liveDetectTimer = setInterval(() => { void this.detectLiveEdges(); }, intervalMs);
  }

  stopLiveEdgeDetection() {
    if (this.liveDetectTimer) {
      clearInterval(this.liveDetectTimer);
      this.liveDetectTimer = null;
    }
    this.liveDetectRunning = false;
  }

  private async detectLiveEdges() {
    if (this.liveDetectRunning || this.isCapturing || !this.config.enableEdgeDetection) return;
    if (!this.cameraRef?.current) return;

    this.liveDetectRunning = true;
    let thumbUri: string | null = null;
    let resizedUri: string | null = null;

    try {
      // Guard: isCapturing may have become true between the interval tick and here
      if (this.isCapturing) {
        if (__DEV__) console.log('[ScannerCapture] skippedLiveDetectDueToManualCapture');
        return;
      }
      const photo = await (this.cameraRef.current as any).takePictureAsync({
        quality: 0.7,
      });
      thumbUri = photo.uri;

      // After the await: manual capture may have started while we were snapshotting
      if (this.isCapturing) {
        if (__DEV__) console.log('[ScannerCapture] skippedLiveDetectDueToManualCapture post-snapshot');
        return;
      }

      if (__DEV__) console.log('[ScannerLive] snapshot w=' + (photo.width ?? '?') + ' h=' + (photo.height ?? '?'));
      // Only downscale to 900px if the image is larger; never upscale.
      // snapshot is 888px on this device — upscaling adds nothing and wastes time.
      const needsResize = (photo.width ?? 0) > 900;
      let resized = { uri: thumbUri!, width: photo.width ?? 888, height: photo.height ?? 1920 };
      if (needsResize) {
        const r = await manipulateAsync(
          thumbUri!,
          [{ resize: { width: 900 } }],
          { compress: 0.9, format: SaveFormat.JPEG },
        );
        resizedUri = r.uri;
        resized = { uri: r.uri, width: r.width ?? 900, height: r.height ?? 1946 };
      }
      if (__DEV__) console.log('[ScannerLive] proc w=' + resized.width + ' h=' + resized.height + ' resized=' + needsResize);

      const corners = await nativeDetectDocumentEdges({ uri: resized.uri });
      if (__DEV__) console.log('[ScannerLive] conf=' + (corners?.confidence?.toFixed(3) ?? 'null'));
      if (corners && corners.confidence > 0.55) {
        this.lastCornersTimestamp = Date.now();
        this.lastCaptureNormalizedCorners = corners;
        const displayCorners = this.captureToPreviewCorners(corners, resized.width, resized.height);
        this.edgeDetector.processFrame({ uri: resized.uri, _precomputedCorners: displayCorners });
      } else {
        this.lastEdgeState = { corners: null, confidence: 0, stabilityScore: 0, detected: false };
        this.autoCapture.updateEdgeConfidence(0);
        this.emit({ type: 'edge_state_changed', state: { corners: null, confidence: 0, stabilityScore: 0, detected: false } });
      }
    } catch {
      // ignore — camera not ready, app backgrounded, etc.
    } finally {
      this.liveDetectRunning = false;
      if (thumbUri) void FileSystem.deleteAsync(thumbUri, { idempotent: true }).catch(() => {});
      if (resizedUri && resizedUri !== thumbUri) {
        void FileSystem.deleteAsync(resizedUri, { idempotent: true }).catch(() => {});
      }
    }
  }

  dispose() {
    this.stopLiveEdgeDetection();
    this.autoCapture.stop();
    this.lastCaptureNormalizedCorners = null;
    this.listeners = [];
  }
}
