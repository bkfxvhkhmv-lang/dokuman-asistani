export type SensitiveDataType = 'iban' | 'tax_id' | 'address' | 'plate' | 'phone' | 'other';

export interface SensitiveRegion {
  x: number;       // normalized 0–1
  y: number;
  width: number;
  height: number;
  type: SensitiveDataType;
  label?: string;  // human-readable, e.g. "IBAN DE12..."
  value?: string;  // raw matched string
}

export interface DetectionResult {
  regions: SensitiveRegion[];
  hasHighRisk: boolean;
  summary: string[];
}
