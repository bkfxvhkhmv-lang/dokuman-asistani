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
  // Datenvorschau (Form / Settlement)
  fields?: { name: string; value: string }[];
  tables?: { rows: number; cols: number; preview: string[][] }[];
  // Common
  recommended_actions?: string[];
  warnings?: string[];
  /** Ham OCR metni — tam metin araması için; ilk 2000 karakter */
  raw_text?: string;
}

export interface OcrMvpJobStatus {
  job_id: string;
  status: 'processing' | 'done' | 'error';
  document_type?: string;
  language?: string;
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

async function parseJsonResponse<T>(res: Response, context: string): Promise<T> {
  const text = await res.text().catch(() => '');
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`${context}: leere Antwort (${res.status})`);
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    const preview = trimmed.slice(0, 200);
    throw new Error(
      res.ok
        ? `${context}: ungültige JSON-Antwort`
        : `${context} ${res.status}: ${preview}`,
    );
  }

  if (!res.ok) {
    const detail =
      typeof data === 'object' && data !== null && 'detail' in data
        ? (data as { detail?: unknown }).detail
        : null;
    throw new Error(`${context} ${res.status}: ${String(detail ?? trimmed).slice(0, 200)}`);
  }

  return data as T;
}

// POST /documents/analyze
export async function analyzeDocument(
  file: OcrMvpFile,
  forceType?: OcrMvpForceType,
  signal?: AbortSignal,
  meta?: { sourceType?: string; pageCount?: number },
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
  if (meta?.sourceType) {
    form.append('source_type', meta.sourceType);
  }
  if (meta?.pageCount != null) {
    form.append('page_count', String(meta.pageCount));
  }

  const res = await fetch(`${OCR_MVP_BASE}/documents/analyze`, {
    method: 'POST',
    body: form,
    signal,
    // Content-Type header verilmiyor — RN FormData boundary'yi otomatik ekler
  });
  return parseJsonResponse<{ job_id: string; status: string }>(res, 'OCR upload hatası');
}

// POST /documents/{job_id}/accepted — learning loop: final accepted snapshot
export async function postAcceptedSnapshot(
  jobId: string | null | undefined,
  body: {
    final_kind?: string | null;
    final_fields: Record<string, unknown>;
    final_language?: string | null;
  },
): Promise<void> {
  const id = jobId ?? 'unknown';
  try {
    await fetch(`${OCR_MVP_BASE}/documents/${id}/accepted`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // fire-and-forget — network errors must never affect the save flow
  }
}

// POST /documents/{job_id}/corrections — learning loop: user edit correction
export async function postCorrectionEvent(
  jobId: string,
  body: {
    field_key: string;
    old_value?: unknown;
    new_value: unknown;
    source: string;
    screen: string;
  },
): Promise<void> {
  try {
    await fetch(`${OCR_MVP_BASE}/documents/${jobId}/corrections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // fire-and-forget — must never affect the edit/save flow
  }
}

// GET /documents/{job_id}/result
export async function getOcrResult(jobId: string): Promise<OcrMvpJobStatus> {
  const res = await fetch(`${OCR_MVP_BASE}/documents/${jobId}/result`);
  if (res.status === 404) throw new Error('Job bulunamadı');
  return parseJsonResponse<OcrMvpJobStatus>(res, 'OCR Ergebnisfehler');
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
