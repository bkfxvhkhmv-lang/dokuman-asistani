import type { RefObject } from 'react';
import { CameraView } from 'expo-camera';
import { Dimensions } from 'react-native';
import { AutoCaptureReadiness, CaptureConfig, CaptureResult, EdgeDetectionState, ScannerListener, ScannerEvent } from '../types';
import { EdgeDetector } from './EdgeDetector';
import { AutoCaptureEngine } from './AutoCapture';
import { PerspectiveCorrector } from './PerspectiveCorrector';
import { Enhancer } from '../../image-processing/core/Enhancer';
import { QualityAnalyzer } from '../../image-processing/core/QualityAnalyzer';

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
  private lastAutoCaptureReadiness: AutoCaptureReadiness = {
    score: 0,
    motionConfidence: 0,
    edgeConfidence: 0,
    blurScore: 1,
    brightnessScore: 1,
    distortionScore: 1,
    stable: false,
    ready: false,
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
    try {
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

      // Crop to the guide frame region (accounts for preview-vs-sensor aspect difference).
      // analyzeCapture uses a blind 5% inset that ignores background — replaced here.
      const captureCorners = this.computeGuideCropCorners(photo.width, photo.height);

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
   * Guide frame constants must match styles.ts / DocumentOverlay.tsx:
   *   width = 95% of screen, centered; top = 10%; height = width × 1.414 (A4).
   */
  private computeGuideCropCorners(captureW: number, captureH: number): import('../types').DocumentCorners {
    const { width: SW, height: SH } = Dimensions.get('window');

    const GUIDE_RATIO  = 0.95;
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

  dispose() {
    this.autoCapture.stop();
    this.listeners = [];
  }
}
