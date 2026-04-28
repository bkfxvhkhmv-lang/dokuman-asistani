import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';
import { AutoCaptureReadiness, StabilityState, ScannerListener, ScannerEvent } from '../types';

export class AutoCaptureEngine {
  private subscription: any = null;
  private lastAccel = { x: 0, y: 0, z: 0 };
  private stabilityStart: number | null = null;
  private isStable = false;
  private listeners: ScannerListener[] = [];
  private config = {
    threshold: 0.15,
    requiredDuration: 800,
    autoTriggerDelay: 1200,
    readinessThreshold: 0.78,
  };
  private enabled = false;

  // Scoring components
  private edgeConfidence = 0;
  private lastMotionConfidence = 0;
  private blurScore = 1.0;        // 0 = very blurry, 1 = sharp
  private brightnessScore = 1.0;  // 0 = too dark/bright, 1 = optimal
  private distortionScore = 1.0;  // 0 = heavy distortion, 1 = flat

  private lastReadiness: AutoCaptureReadiness = {
    score: 0,
    motionConfidence: 0,
    edgeConfidence: 0,
    blurScore: 1,
    brightnessScore: 1,
    distortionScore: 1,
    stable: false,
    ready: false,
  };

  constructor(config?: Partial<typeof AutoCaptureEngine.prototype.config>) {
    if (config) Object.assign(this.config, config);
  }

  addListener(listener: ScannerListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(event: ScannerEvent) {
    this.listeners.forEach(l => {
      try { l(event); } catch (e) { console.error('Scanner listener error:', e); }
    });
  }

  async start() {
    if (this.enabled) return;
    this.enabled = true;
    try {
      const permission = await Accelerometer.requestPermissionsAsync();
      if (!permission.granted) {
        this.emit({ type: 'error', error: { code: 'ACCEL_PERM_DENIED', message: 'Accelerometer permission denied', recoverable: true } });
        return;
      }
      Accelerometer.setUpdateInterval(80);
      this.subscription = Accelerometer.addListener(({ x, y, z }) => this.processAccelerometer(x, y, z));
    } catch (e) {
      this.emit({ type: 'error', error: { code: 'ACCEL_INIT_FAILED', message: 'Failed to initialize accelerometer', recoverable: true } });
    }
  }

  stop() {
    this.enabled = false;
    this.subscription?.remove();
    this.subscription = null;
    this.stabilityStart = null;
    this.isStable = false;
    this.edgeConfidence = 0;
    this.lastMotionConfidence = 0;
  }

  updateEdgeConfidence(confidence: number) {
    this.edgeConfidence = Math.max(0, Math.min(confidence, 1));
    this.emitReadiness();
  }

  /**
   * Feed quality scores from QualityAnalyzer or image analysis.
   * blurScore: 0-1 (1 = sharp)
   * brightnessScore: 0-1 (1 = well lit)
   * distortionScore: 0-1 (1 = minimal distortion, flat document)
   */
  updateQualityScores(blur: number, brightness: number, distortion: number) {
    this.blurScore = Math.max(0, Math.min(blur, 1));
    this.brightnessScore = Math.max(0, Math.min(brightness, 1));
    this.distortionScore = Math.max(0, Math.min(distortion, 1));
    this.emitReadiness();
  }

  /**
   * Estimate quality scores from image file size and dimensions.
   * This is a heuristic proxy when pixel-level analysis isn't available.
   * fileSizeBytes / (width * height): low ratio → likely blurry (compresses more)
   * aspectRatio: far from A4 → possible distortion
   */
  estimateQualityFromMeta(fileSizeBytes: number, width: number, height: number) {
    const pixelCount = width * height;
    const bpp = fileSizeBytes / pixelCount; // bytes per pixel
    // Typical sharp JPEG: 0.3–1.5 bpp; blurry: <0.15 bpp
    const blur = Math.min(1, Math.max(0, (bpp - 0.05) / 0.5));

    // Brightness heuristic: can't measure from metadata, assume 0.85 (decent)
    const brightness = 0.85;

    // Distortion: how close to A4 aspect ratio (portrait)
    const aspectRatio = height / width;
    const a4Ratio = 1.414;
    const distortion = Math.max(0.4, 1 - Math.abs(aspectRatio - a4Ratio) * 1.5);

    this.updateQualityScores(blur, brightness, distortion);
  }

  private processAccelerometer(x: number, y: number, z: number) {
    const last = this.lastAccel;
    const delta = Math.sqrt(
      Math.pow(x - last.x, 2) +
      Math.pow(y - last.y, 2) +
      Math.pow(z - last.z, 2)
    );
    this.lastAccel = { x, y, z };

    if (delta < this.config.threshold) {
      if (!this.stabilityStart) {
        this.stabilityStart = Date.now();
      } else {
        const duration = Date.now() - this.stabilityStart;
        const confidence = Math.min(duration / this.config.requiredDuration, 1);
        this.lastMotionConfidence = confidence;

        if (duration > this.config.requiredDuration && !this.isStable) {
          this.isStable = true;
          this.emit({ type: 'stability_changed', state: { isStable: true, stabilityDuration: duration, confidence } });
          this.emitReadiness();
        } else if (!this.isStable) {
          this.emit({ type: 'stability_changed', state: { isStable: false, stabilityDuration: duration, confidence } });
          this.emitReadiness();
        }
      }
    } else {
      this.stabilityStart = null;
      this.lastMotionConfidence = 0;
      if (this.isStable) {
        this.isStable = false;
        this.emit({ type: 'stability_changed', state: { isStable: false, stabilityDuration: 0, confidence: 0 } });
      }
      this.emitReadiness();
    }
  }

  private emitReadiness() {
    // Weighted composite score:
    // Motion stability:  35% — most important, camera shake ruins everything
    // Edge confidence:   30% — document must be in frame
    // Blur score:        20% — sharp image needed for OCR
    // Brightness:        10% — must be well lit
    // Distortion:         5% — nice to have, but fallback corrects most
    const score = Number((
      (this.lastMotionConfidence * 0.35) +
      (this.edgeConfidence       * 0.30) +
      (this.blurScore            * 0.20) +
      (this.brightnessScore      * 0.10) +
      (this.distortionScore      * 0.05)
    ).toFixed(3));

    const readiness: AutoCaptureReadiness = {
      score,
      motionConfidence: this.lastMotionConfidence,
      edgeConfidence: this.edgeConfidence,
      blurScore: this.blurScore,
      brightnessScore: this.brightnessScore,
      distortionScore: this.distortionScore,
      stable: this.isStable,
      ready: this.isStable && score >= this.config.readinessThreshold,
    };

    this.lastReadiness = readiness;
    this.emit({ type: 'auto_capture_ready', readiness });
    if (readiness.ready) this.emit({ type: 'capture_ready' });
  }

  triggerFeedback() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (Platform.OS === 'android') Vibration.vibrate(50);
  }

  get isCurrentlyStable() { return this.isStable; }
  get readiness() { return this.lastReadiness; }
}
