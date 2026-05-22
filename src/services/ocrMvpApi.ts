import { OCR_MVP_BASE } from '@/config';

export interface OcrMvpFile {
  uri: string;
  name?: string;
  mimeType?: string;
}

export type OcrMvpForceType =
  | 'invoice'
  | 'settlement'
  | 'insurance'
  | 'quote'
  | 'form'
  | 'letter';

export interface OcrMvpActionSummary {
  kind?: string;
  title?: string;
  // Form / Settlement
  fields_count?: number;
  tables_count?: number;
  lines_count?: number;
  // Invoice
  vendor_name?: string;
  invoice_number?: string;
  invoice_date?: string;
  amount?: number | null;
  total_brutto?: number | null;
  total_netto?: number | null;
  total_vat?: number | null;
  line_items_count?: number;
  currency?: string;
  iban?: string | null;
  due_date?: string | null;
  category?: string | null;
  // Letter / Insurance
  sender?: string;
  document_date?: string;
  deadline?: string | null;
  risk_level?: string;
  risk_description?: string;
  required_action?: string;
  recommended_step?: string;
  summary?: string | null;
  // Common
  recommended_actions?: string[];
  warnings?: string[];
}

export interface OcrMvpJobStatus {
  job_id: string;
  status: 'processing' | 'done' | 'error';
  document_type?: string;
  confidence?: number;
  provider?: string;
  needs_review?: boolean;
  output_path?: string;
  reasons?: string[];
  action_summary?: OcrMvpActionSummary;
  error?: string;
  created_at?: string;
  finished_at?: string;
}

// POST /documents/analyze
export async function analyzeDocument(
  file: OcrMvpFile,
  forceType?: OcrMvpForceType,
): Promise<{ job_id: string; status: string }> {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name ?? 'document.pdf',
    type: file.mimeType ?? 'application/pdf',
  } as unknown as Blob);

  if (forceType) {
    form.append('force_type', forceType);
  }

  const res = await fetch(`${OCR_MVP_BASE}/documents/analyze`, {
    method: 'POST',
    body: form,
    // Content-Type header verilmiyor — RN FormData boundary'yi otomatik ekler
  });

  if (!res.ok) {
    const text = await res.text().catch(() => String(res.status));
    throw new Error(`OCR upload hatası ${res.status}: ${text}`);
  }

  return res.json();
}

// GET /documents/{job_id}/result
export async function getOcrResult(jobId: string): Promise<OcrMvpJobStatus> {
  const res = await fetch(`${OCR_MVP_BASE}/documents/${jobId}/result`);
  if (res.status === 404) throw new Error('Job bulunamadı');
  return res.json();
}

// GET /documents/{job_id}/download → local file URI
export async function downloadOcrResult(
  jobId: string,
  filename: string = 'briefpilot_output',
): Promise<string> {
  const FileSystem = await import('expo-file-system/legacy');
  const destUri = (FileSystem.cacheDirectory ?? '') + filename;

  const result = await FileSystem.downloadAsync(
    `${OCR_MVP_BASE}/documents/${jobId}/download`,
    destUri,
  );

  if (result.status !== 200) {
    throw new Error(`Download hatası: ${result.status}`);
  }

  return result.uri;
}
