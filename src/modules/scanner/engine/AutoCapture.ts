import { Gyroscope } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';
import { AutoCaptureReadiness, StabilityState, ScannerListener, ScannerEvent } from '@/modules/scanner/types';

export class AutoCaptureEngine {
  private subscription: any = null;
  private stabilityStart: number | null = null;
  private isStable = false;
  private listeners: ScannerListener[] = [];
  private config = {
    // rad/s — kullanıcının koduyla aynı: 0.1 rad/s altı = sabit
    threshold: 0.10,
    // 500ms sabit kaldıktan sonra "stable" (kullanıcının 0.5s timer'ı)
    requiredDuration: 500,
    autoTriggerDelay: 800,
    readinessThreshold: 0.74,
  };
  private enabled = false;

  // Scoring components
  private edgeConfidence = 0;
  private lastMotionConfidence = 0;
  private blurScore = 1.0;        // 0 = very blurry, 1 = sharp
  private brightnessScore = 1.0;  // 0 = too dark/bright, 1 = optimal
  private distortionScore = 1.0;  // 0 = heavy distortion, 1 = flat

  private capturedAt: number | null = null;
  private readonly COOLDOWN_MS = 1500;

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
      const permission = await Gyroscope.requestPermissionsAsync();
      if (!permission.granted) {
        this.emit({ type: 'error', error: { code: 'GYRO_PERM_DENIED', message: 'Gyroscope permission denied', recoverable: true } });
        return;
      }
      // 50ms = 20fps — kullanıcının deviceMotionUpdateInterval: 0.05 ile aynı
      Gyroscope.setUpdateInterval(50);
      this.subscription = Gyroscope.addListener(({ x, y, z }) => this.processGyroscope(x, y, z));
    } catch (e) {
      this.emit({ type: 'error', error: { code: 'GYRO_INIT_FAILED', message: 'Failed to initialize gyroscope', recoverable: true } });
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
    this.capturedAt = null;
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

  private processGyroscope(x: number, y: number, z: number) {
    // Angular velocity magnitude (rad/s) — kullanıcının speed hesabıyla aynı
    const speed = Math.sqrt(x * x + y * y + z * z);

    if (speed < this.config.threshold) {
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
    if (__DEV__) console.log('[AutoCapture] score=' + score.toFixed(3) + ' threshold=' + this.config.readinessThreshold + ' edgeConf=' + this.edgeConfidence.toFixed(3) + ' stable=' + this.isStable + ' ready=' + readiness.ready);
    this.emit({ type: 'auto_capture_ready', readiness });
    if (readiness.ready) {
      const now = Date.now();
      if (this.capturedAt === null || now - this.capturedAt >= this.COOLDOWN_MS) {
        this.capturedAt = now;
        if (__DEV__) console.log('[AutoCapture] captured cooldownMs=' + this.COOLDOWN_MS);
        this.emit({ type: 'capture_ready' });
      }
    }
  }

  triggerFeedback() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (Platform.OS === 'android') Vibration.vibrate(50);
  }

  get isCurrentlyStable() { return this.isStable; }
  get readiness() { return this.lastReadiness; }
}
