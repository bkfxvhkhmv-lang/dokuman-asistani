export interface ScannedAsset {
  uri: string;
  name: string;
  mimeType: string;
  source: 'camera' | 'file' | 'photo-library' | 'scanner';
  displayName: string;
  /** Local image URI usable as thumbnail. Absent for PDF/file picks. */
  previewUri?: string;
  /**
   * Number of pages returned by native document scanner.
   * >1 means multi-page scan — backend PDF support required before analysis.
   */
  pageCount?: number;
}

export interface ScannerProvider {
  pickFile(): Promise<ScannedAsset | null>;
  pickFromLibrary(): Promise<ScannedAsset | null>;
  takePhoto(): Promise<ScannedAsset | null>;
  /** Uses native document scanner (VisionKit on iOS). Falls back to takePhoto(). */
  takePhotoWithScanner(): Promise<ScannedAsset | null>;
  scanDocument(): Promise<ScannedAsset[]>;
}
