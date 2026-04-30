import type { DistanceHint } from '@/hooks/useScanner';

export const DISTANCE_HINT_CONFIG: Record<NonNullable<DistanceHint>, { icon: string; key: string; color: string }> = {
  closer:  { icon: '↓', key: 'scan.distance_closer', color: '#FFB703' },
  farther: { icon: '↑', key: 'scan.distance_farther', color: '#FFB703' },
  perfect: { icon: '✓', key: 'scan.distance_perfect', color: '#2DC653' },
};

export const QUALITY_PRESET_ROWS = [
  { id: 'auto' as const, labelKey: 'scan.quality_preset_auto' },
  { id: 'document' as const, labelKey: 'scan.quality_preset_document' },
  { id: 'bw' as const, labelKey: 'scan.quality_preset_bw' },
  { id: 'receipt' as const, labelKey: 'scan.quality_preset_receipt' },
];
