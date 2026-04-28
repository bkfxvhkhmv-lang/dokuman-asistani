export * from '../scanner/types';

export interface ImageFilter {
  id: string;
  name: string;
  icon: string;
  apply(imageUri: string): Promise<string>;
}

export interface FilterResult {
  uri: string;
  filterId: string;
  processingTime: number;
}

export interface ProcessingError {
  stage: string;
  message: string;
  originalUri: string;
}

export interface QualityMetrics {
  blurScore: number;
  contrastScore: number;
  brightnessScore: number;
  sharpnessScore: number;
  overallScore: number;
}

export type ImagePipelineMode = 'preview' | 'final';
export type ImageEditMode = 'none' | 'crop' | 'filter-preview' | 'filter-commit' | 'rotate' | 'enhance';

export interface ImageSessionEdit {
  id: string;
  type: 'crop' | 'perspective' | 'filter' | 'enhancement' | 'quality';
  createdAt: number;
  data?: Record<string, unknown>;
}

export interface ImageSession {
  id: string;
  originalUri: string;
  croppedUri?: string;
  correctedUri?: string;
  rotatedUri?: string;
  enhancedUri?: string;
  previewUri?: string;
  finalUri: string;
  activeFilter: string;
  rotation: number;
  editMode?: ImageEditMode;
  quality?: QualityMetrics;
  ocrText?: string;
  metadata?: Record<string, unknown>;
  risk?: string;
  edits: ImageSessionEdit[];
  createdAt: number;
  updatedAt: number;
}

export interface ProcessingConfig {
  filter?: string;
  mode?: ImagePipelineMode;
  quality?: {
    skipGate?: boolean;
  };
}

export interface ProcessingResult {
  session: ImageSession;
  uri: string;
  filterId: string;
  processingTime: number;
  applied: boolean;
  quality?: QualityMetrics;
}

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CropImageSize {
  w: number;
  h: number;
}

export interface CropPixelRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface FastQualityResult {
  passed: boolean;
  minResolution: boolean;
  minFileSize: boolean;
  roughBlurScore: number;
  recommendation: 'accept' | 'reject' | 'warn';
  fileSize: number | null;
  width: number;
  height: number;
  reason: string | null;
}

export interface DetailedQualityReport {
  metrics: QualityMetrics;
  ocrReadiness: number;
  edgeDensity: number;
  histogramSpread: number;
  recommendations: string[];
}
