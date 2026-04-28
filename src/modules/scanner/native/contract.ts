import type { DocumentCorners } from '../types';

export const SCANNER_NATIVE_MODULE_NAME = 'BriefPilotScanner';

export interface NativeScannerCapabilities {
  edgeDetection: boolean;
  perspectiveCorrection: boolean;
  filters: boolean;
  frameProcessor: boolean;
  platform: 'ios' | 'android';
  version: string;
}

export interface NativeEdgeDetectionInput {
  imageUri: string;
  width?: number;
  height?: number;
}

export interface NativeWarpPerspectiveInput {
  imageUri: string;
  corners: DocumentCorners;
}

export interface NativeFilterInput {
  imageUri: string;
  filterId: string;
}

export interface NativeWarpPerspectiveResult {
  uri: string;
}

export interface NativeFilterResult {
  uri: string;
}

export interface NativeScannerModuleContract {
  getCapabilities(): Promise<NativeScannerCapabilities>;
  detectDocumentEdges(input: NativeEdgeDetectionInput): Promise<DocumentCorners | null>;
  warpPerspective(input: NativeWarpPerspectiveInput): Promise<NativeWarpPerspectiveResult>;
  applyFilter(input: NativeFilterInput): Promise<NativeFilterResult>;
}
