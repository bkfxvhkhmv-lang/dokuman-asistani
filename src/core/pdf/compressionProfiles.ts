export type CompressionProfile = 'draft' | 'standard' | 'high' | 'archive';

export interface ProfileSpec {
  label: string;
  dpi: number;
  jpegQuality: number;    // 0-1 for expo-image-manipulator
  targetWidthPx: number;  // Target width for A4 portrait at this DPI
  targetHeightPx: number;
  compress: number;       // expo-print compression hint
}

// A4 dimensions at various DPIs (portrait):
// 72 DPI  → 595  × 842
// 150 DPI → 1240 × 1754
// 300 DPI → 2480 × 3508
export const COMPRESSION_PROFILES: Record<CompressionProfile, ProfileSpec> = {
  draft: {
    label: 'Entwurf',
    dpi: 72,
    jpegQuality: 0.60,
    targetWidthPx: 595,
    targetHeightPx: 842,
    compress: 0.6,
  },
  standard: {
    label: 'Standard',
    dpi: 150,
    jpegQuality: 0.85,
    targetWidthPx: 1240,
    targetHeightPx: 1754,
    compress: 0.85,
  },
  high: {
    label: 'Druckqualität',
    dpi: 300,
    jpegQuality: 0.92,
    targetWidthPx: 2480,
    targetHeightPx: 3508,
    compress: 0.92,
  },
  archive: {
    label: 'Archiv (durchsuchbar)',
    dpi: 300,
    jpegQuality: 0.95,
    targetWidthPx: 2480,
    targetHeightPx: 3508,
    compress: 0.95,
  },
};

export function getProfile(profile: CompressionProfile): ProfileSpec {
  return COMPRESSION_PROFILES[profile];
}
