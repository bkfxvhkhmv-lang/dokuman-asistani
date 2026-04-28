import type { CaptureResult } from '../scanner/types';
import type { OcrResult } from '../ocr/types';
import type { ImageSession } from '../image-processing/types';

export interface BatchPage {
  id: string;
  uri: string;
  order: number;
  filter?: string;
  corners?: any;
  enhanced?: boolean;
  selected?: boolean;
  createdAt: number;
  capture?: CaptureResult;
  imageSession?: ImageSession;
  ocr?: OcrResult;
  metadata?: Record<string, any>;
}

export interface BatchConfig {
  maxPages: number;
  autoSort: boolean;
  generatePdf: boolean;
  pdfQuality: 'low' | 'medium' | 'high';
}

export interface PdfResult {
  uri: string;
  pageCount: number;
  fileSize: number;
}

export interface BatchError {
  pageId?: string;
  stage: string;
  message: string;
}
