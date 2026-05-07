import type { CameraQualityGateResult, CameraQualityTier } from '@/modules/scanner/engine/camera-quality-gate';

export type OverlayColor = 'green' | 'yellow' | 'orange' | 'red' | 'gray';

const TIER_COLOR_MAP: Readonly<Record<CameraQualityTier, OverlayColor>> = {
  excellent: 'green',
  good: 'green',
  acceptable: 'yellow',
  poor: 'orange',
  rejected: 'red',
};

export function getOverlayColor(
  quality: CameraQualityGateResult | null | undefined,
  hasDetection: boolean,
): string {
  if (!hasDetection || !quality) return 'rgba(255,255,255,0.70)';

  switch (TIER_COLOR_MAP[quality.tier]) {
    case 'green':
      return '#22C55E';
    case 'yellow':
      return '#EAB308';
    case 'orange':
      return '#F97316';
    case 'red':
      return '#EF4444';
    case 'gray':
    default:
      return 'rgba(255,255,255,0.70)';
  }
}

export function getStatusText(
  quality: CameraQualityGateResult | null | undefined,
  distanceHint: 'closer' | 'farther' | 'perfect' | null,
  hasDetection: boolean,
): string {
  if (!hasDetection || !quality) {
    return 'Dokument in den Rahmen';
  }
  if (quality.tier === 'rejected') {
    return 'Qualitat unzureichend';
  }
  if (quality.tier === 'poor') {
    return 'Besser positionieren';
  }
  if (distanceHint === 'closer') {
    return 'Naher heranhalten';
  }
  if (distanceHint === 'farther') {
    return 'Etwas weiter weg';
  }
  if (quality.tier === 'excellent' || quality.tier === 'good') {
    return 'Dokument erkannt';
  }
  return 'Position optimieren';
}
