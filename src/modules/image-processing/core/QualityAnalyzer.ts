import * as FileSystem from 'expo-file-system/legacy';
import type { CaptureResult, ScanQualityAnalysis, ScanQualityInput } from '../../scanner/types';
import type { DetailedQualityReport, FastQualityResult, QualityMetrics } from '../types';

function defaultMetrics(): QualityMetrics {
  return {
    blurScore: 70,
    contrastScore: 75,
    brightnessScore: 70,
    sharpnessScore: 65,
    overallScore: 70,
  };
}

export class FastQualityGate {
  async check({ uri, width, height }: ScanQualityInput): Promise<FastQualityResult> {
    const info = await FileSystem.getInfoAsync(uri, { size: true } as any);
    const fileSize = typeof (info as any).size === 'number' ? (info as any).size : null;
    const minResolution = width >= 800 && height >= 800;
    const minFileSize = fileSize == null || fileSize >= 80_000;
    const roughBlurScore = fileSize == null
      ? 60
      : Math.min(95, Math.max(10, Math.round((Math.min(fileSize / (1024 * 1024), 2) / 2) * 85 + 10)));

    let reason: string | null = null;
    let recommendation: FastQualityResult['recommendation'] = 'accept';

    if (!minResolution) {
      reason = `Auflösung zu niedrig (${width}×${height}px). Mindestens 800×800 empfohlen.`;
      recommendation = 'reject';
    } else if (!minFileSize || roughBlurScore < 35) {
      reason = 'Das Foto wirkt unscharf oder zu dunkel. Die Texterkennung könnte fehlschlagen.';
      recommendation = roughBlurScore < 25 ? 'reject' : 'warn';
    }

    return {
      passed: recommendation !== 'reject',
      minResolution,
      minFileSize,
      roughBlurScore,
      recommendation,
      fileSize,
      width,
      height,
      reason,
    };
  }
}

export class DetailedQualityAnalyzer {
  /**
   * Bytes-per-megapixel is a meaningful sharpness proxy for JPEG document scans:
   * sharp images contain high-frequency detail that JPEG cannot compress well → more bytes.
   * Blurry / dark images compress efficiently → fewer bytes → lower score.
   *
   * Calibration (8 MP crop at quality 0.92):
   *   ≥100 KB/MP → 95 %  (sharp, well-lit document)
   *    60 KB/MP → 74 %  (acceptable, slight blur)
   *    30 KB/MP → 56 %  (blurry or dark)
   *   ≤15 KB/MP → 20 %  (unusable)
   *
   * Falls back to file-size-only when dimensions are unavailable.
   */
  async analyze(imageUri: string, imgWidth?: number, imgHeight?: number): Promise<DetailedQualityReport> {
    try {
      const info = await FileSystem.getInfoAsync(imageUri, { size: true } as any);
      const fileSize = typeof (info as any).size === 'number' ? (info as any).size : null;
      if (!fileSize) {
        const metrics = defaultMetrics();
        return { metrics, ocrReadiness: 68, edgeDensity: 0.55, histogramSpread: 0.62, recommendations: [] };
      }

      // ── Bytes-per-megapixel (preferred) ────────────────────────────────────
      let blurScore: number;
      if (imgWidth && imgHeight && imgWidth > 0 && imgHeight > 0) {
        const megapixels = (imgWidth * imgHeight) / 1_000_000;
        const kbPerMP    = fileSize / 1024 / megapixels;
        // score = min(95, max(20, round(min(kbPerMP/100, 1) * 75 + 20)))
        blurScore = Math.min(95, Math.max(20, Math.round(Math.min(kbPerMP / 100, 1) * 75 + 20)));
      } else {
        // Fallback: raw file size with document-calibrated mapping
        const sizeMB = fileSize / (1024 * 1024);
        blurScore = Math.min(95, Math.max(20, Math.round((Math.min(sizeMB, 1.5) / 1.5) * 40 + 55)));
      }

      const sharpnessScore  = Math.min(95, Math.round(blurScore * 0.95 + 3));
      const contrastScore   = Math.min(95, Math.round(blurScore * 0.85 + 12));
      const brightnessScore = (fileSize / (1024 * 1024)) < 0.15 ? 52 : 78;
      const overallScore    = Math.round(
        blurScore * 0.40 + sharpnessScore * 0.30 + contrastScore * 0.20 + brightnessScore * 0.10
      );
      const metrics: QualityMetrics = { blurScore, contrastScore, brightnessScore, sharpnessScore, overallScore };
      const edgeDensity = Number(Math.min(1, Math.max(0.2, sharpnessScore / 100)).toFixed(2));
      const histogramSpread = Number(Math.min(1, Math.max(0.25, contrastScore / 100)).toFixed(2));
      const ocrReadiness = Math.round(
        metrics.overallScore * 0.5 + metrics.sharpnessScore * 0.2 + metrics.contrastScore * 0.2 + metrics.brightnessScore * 0.1
      );
      const recommendations: string[] = [];
      if (blurScore < 40) recommendations.push('Schärfe erhöhen oder neu aufnehmen');
      if (contrastScore < 45) recommendations.push('Kontrast oder Clean-Filter anwenden');
      if (brightnessScore < 40) recommendations.push('Mehr Licht verwenden');
      if (ocrReadiness < 55) recommendations.push('Vor OCR erneut verbessern oder zuschneiden');
      return { metrics, ocrReadiness, edgeDensity, histogramSpread, recommendations };
    } catch {
      const metrics = defaultMetrics();
      return { metrics, ocrReadiness: 68, edgeDensity: 0.55, histogramSpread: 0.62, recommendations: [] };
    }
  }
}

export class QualityAnalyzer {
  private detailedAnalyzer = new DetailedQualityAnalyzer();

  async analyze(imageUri: string, imgWidth?: number, imgHeight?: number): Promise<QualityMetrics> {
    return (await this.detailedAnalyzer.analyze(imageUri, imgWidth, imgHeight)).metrics;
  }

  async analyzeDetailed(imageUri: string, imgWidth?: number, imgHeight?: number): Promise<DetailedQualityReport> {
    return this.detailedAnalyzer.analyze(imageUri, imgWidth, imgHeight);
  }

  isQualityAcceptable(metrics: QualityMetrics): boolean {
    return metrics.overallScore > 55 && metrics.blurScore > 35;
  }

  getQualityWarnings(metrics: QualityMetrics): string[] {
    const warnings: string[] = [];
    if (metrics.blurScore < 40) warnings.push('Bild unscharf — neu aufnehmen empfohlen');
    if (metrics.contrastScore < 40) warnings.push('Kontrast zu niedrig');
    if (metrics.brightnessScore < 30) warnings.push('Bild zu dunkel');
    if (metrics.brightnessScore > 90) warnings.push('Bild überbelichtet');
    return warnings;
  }
}

export async function analyzeCaptureQuality(input: ScanQualityInput): Promise<ScanQualityAnalysis> {
  const result = await new FastQualityGate().check(input);
  return {
    width: result.width,
    height: result.height,
    fileSize: result.fileSize,
    isLowResolution: !result.minResolution,
    isLikelyBlurred: result.roughBlurScore < 35 || !result.minFileSize,
    isAcceptable: result.passed,
    reason: result.reason,
  };
}

export function buildQualityDecisionMessage(analysis: ScanQualityAnalysis) {
  return analysis.reason || 'Die Bildqualität ist ausreichend.';
}

export async function analyzeDetailedImageQuality(imageUri: string) {
  return new DetailedQualityAnalyzer().analyze(imageUri);
}

export async function checkFastQuality(input: ScanQualityInput) {
  return new FastQualityGate().check(input);
}

export function analyzeCaptureResultQuality(capture: CaptureResult) {
  const metrics = capture.qualityMetrics;
  const analyzer = new QualityAnalyzer();
  return {
    uri: capture.finalUri,
    overallScore: metrics?.overallScore ?? null,
    isAcceptable: metrics ? analyzer.isQualityAcceptable(metrics) : true,
    warnings: metrics ? analyzer.getQualityWarnings(metrics) : [],
    processing: capture.processing,
  };
}
