export interface OcrResult {
  text: string;
  confidence: number;
  blocks: TextBlock[];
  language?: string;
}

export interface TextBlock {
  text: string;
  boundingBox: BoundingBox;
  confidence: number;
  words: Word[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Word {
  text: string;
  boundingBox: BoundingBox;
  confidence: number;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  script?: string;
}

export interface OcrEngineConfig {
  languageHints?: string[];
  enableHandwriting?: boolean;
  enableTableDetection?: boolean;
}

export interface OcrPageResult {
  uri: string;
  text: string;
  confidence: number | null;
}

export interface OcrBatchResult {
  text: string;
  confidence: number | null;
  pages: OcrPageResult[];
}

export interface OcrCaptureInput {
  originalUri: string;
  finalUri: string;
  qualityMetrics?: {
    overallScore: number;
  };
}
