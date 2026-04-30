export type ScanQualityPresetId = 'auto' | 'document' | 'bw' | 'receipt';

export interface ScanQualityProfile {
  id: ScanQualityPresetId;
  label: string;
  exposure: number;
  autoCapture: boolean;
  edgeDetection: boolean;
  perspectiveCorrection: boolean;
  preferredFilter: string;
}

const PROFILES: Record<ScanQualityPresetId, ScanQualityProfile> = {
  auto: {
    id: 'auto',
    label: 'Auto',
    exposure: 0,
    autoCapture: true,
    edgeDetection: true,
    perspectiveCorrection: true,
    preferredFilter: 'clean',
  },
  document: {
    id: 'document',
    label: 'Dokument',
    exposure: 0.12,
    autoCapture: false,
    edgeDetection: true,
    perspectiveCorrection: true,
    preferredFilter: 'clean',
  },
  bw: {
    id: 'bw',
    label: 'S/W',
    exposure: 0.06,
    autoCapture: false,
    edgeDetection: true,
    perspectiveCorrection: true,
    preferredFilter: 'mono',
  },
  receipt: {
    id: 'receipt',
    label: 'Beleg',
    exposure: 0.18,
    autoCapture: false,
    edgeDetection: true,
    perspectiveCorrection: true,
    preferredFilter: 'contrast',
  },
};

export const SCAN_QUALITY_PRESET_IDS: ScanQualityPresetId[] = ['auto', 'document', 'bw', 'receipt'];

export function getScanQualityProfile(id: ScanQualityPresetId): ScanQualityProfile {
  return PROFILES[id];
}
