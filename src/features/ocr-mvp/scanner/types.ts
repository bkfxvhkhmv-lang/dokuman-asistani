export interface ScannedAsset {
  uri: string;
  name: string;
  mimeType: string;
  source: 'camera' | 'file' | 'photo-library' | 'scanner';
  displayName: string;
  /** Local image URI usable as thumbnail. Absent for PDF/file picks. */
  previewUri?: string;
}

export interface ScannerProvider {
  pickFile(): Promise<ScannedAsset | null>;
  pickFromLibrary(): Promise<ScannedAsset | null>;
  takePhoto(): Promise<ScannedAsset | null>;
  scanDocument(): Promise<ScannedAsset[]>;
}
