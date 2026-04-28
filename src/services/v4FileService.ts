// Import from source files — NOT from v4Api to avoid circular dependency
import { API_BASE } from '../config';
import { authFetch } from './authService';
import { withRetry } from './retryHelper';

const BASE = API_BASE;

// Minimal inline req for file operations — avoids importing the full v4Api module
async function fileReq<T = unknown>(method: string, path: string, body?: FormData): Promise<T> {
  const opts: RequestInit = { method };
  if (body) opts.body = body;
  const res = await authFetch(`${BASE}${path}`, opts as any);
  if (!res.ok) { const err = await res.text(); throw new Error(`V4 File ${res.status}: ${err}`); }
  return res.json() as Promise<T>;
}

export interface V4Document { id: string; titel?: string; status?: string; [key: string]: unknown; }

export async function uploadDocumentV4(fileUri: string, filename: string): Promise<V4Document> {
  const form = new FormData();
  form.append('file', { uri: fileUri, name: filename, type: 'application/octet-stream' } as any);
  return fileReq<V4Document>('POST', '/documents/', form);
}

export async function downloadDocumentV4(docId: string): Promise<{ blob: Blob; filename: string }> {
  const res = await authFetch(`${BASE}/documents/${docId}/download`);
  if (!res.ok) throw new Error(`Download fehlgeschlagen: ${res.status}`);
  const blob = await res.blob();
  const filename = (res.headers.get('Content-Disposition') || '').match(/filename="?([^"]+)"?/)?.[1] || 'dokument';
  return { blob, filename };
}

export async function shareOriginalFile(docId: string, filename = 'dokument'): Promise<void> {
  const { getAccessToken } = await import('./authService');
  const FileSystem = await import('expo-file-system');
  const Sharing    = await import('expo-sharing');
  const token   = await getAccessToken();
  const destUri = ((FileSystem as any).cacheDirectory ?? '') + filename;
  const result  = await FileSystem.downloadAsync(
    `${BASE}/documents/${docId}/download`,
    destUri,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (result.status !== 200) throw new Error('Dosya indirilemedi');
  if (!await Sharing.isAvailableAsync()) throw new Error('Teilen wird auf diesem Gerät nicht unterstützt');
  await Sharing.shareAsync(result.uri, { mimeType: 'application/octet-stream', dialogTitle: filename });
}

export async function downloadOriginalFileToCache(docId: string, filename = 'dokument'): Promise<string> {
  const { getAccessToken } = await import('./authService');
  const FileSystem = await import('expo-file-system');
  const token   = await getAccessToken();
  const destUri = ((FileSystem as any).cacheDirectory ?? '') + filename;
  const result  = await FileSystem.downloadAsync(
    `${BASE}/documents/${docId}/download`,
    destUri,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (result.status !== 200) throw new Error('Datei konnte nicht heruntergeladen werden');
  return result.uri;
}

export async function uploadDocumentV4Safe(fileUri: string, filename: string): Promise<V4Document> {
  return withRetry(() => uploadDocumentV4(fileUri, filename), { label: 'upload', maxAttempts: 3 });
}
