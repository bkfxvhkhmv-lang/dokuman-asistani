import type { CameraQualityGateResult, CameraQualityTier } from '@/modules/scanner/engine/camera-quality-gate';
import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';

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
  const lang = getLangSync();
  if (!hasDetection || !quality) {
    return t(lang, 'scan.camera.status.frame');
  }
  if (quality.tier === 'rejected') {
    return t(lang, 'scan.camera.status.quality_low');
  }
  if (quality.tier === 'poor') {
    return t(lang, 'scan.camera.status.position_better');
  }
  if (distanceHint === 'closer') {
    return t(lang, 'scan.camera.status.move_closer');
  }
  if (distanceHint === 'farther') {
    return t(lang, 'scan.camera.status.move_farther');
  }
  if (quality.tier === 'excellent' || quality.tier === 'good') {
    return t(lang, 'scan.camera.status.detected');
  }
  return t(lang, 'scan.camera.status.optimize');
}
