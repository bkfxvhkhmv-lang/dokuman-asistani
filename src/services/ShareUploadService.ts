/**
 * ShareUploadService
 *
 * Processes a file received via system share sheet / "Open With".
 * Plugs directly into the existing Smart pipeline (analysiereText + AutoFill).
 *
 * Flow:
 *   1. Receive file URI (file:// or content://)
 *   2. Fire "analyzing" notification immediately
 *   3. Run OCR / text extraction
 *   4. Run AutoFill + Categorization
 *   5. Dispatch document to store
 *   6. Fire "done" notification with value-first content
 *   7. Return the new document ID for navigation
 */

import * as FileSystem from 'expo-file-system/legacy';
import { analysiereText, extractTextFromImage } from './visionApi';
import { runSmartAutoFill, mergeAutoFillIntoDokument } from './SmartAutoFillService';
import { runSmartCategorization, applyCategoryToVisionResult } from './SmartCategorizationService';
import { generateId } from '../utils';
import { buildUploadNotificationContent } from './SmartNotificationsService';
import type { Dokument } from '../store';

export type ShareFileType = 'pdf' | 'image' | 'unknown';

export function detectFileType(uri: string): ShareFileType {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.pdf') || lower.includes('application/pdf')) return 'pdf';
  if (/\.(jpe?g|png|heic|tiff?|webp|bmp)/.test(lower)) return 'image';
  if (lower.includes('image/')) return 'image';
  return 'unknown';
}

export function extractFileNameFromUri(uri: string): string {
  const decoded = decodeURIComponent(uri);
  const last = decoded.split('/').pop() ?? 'Dokument';
  return last.split('?')[0];  // strip query params
}

// ── Notification helpers (fire & forget) ─────────────────────────────────────

async function fireImmediate(title: string, body: string, data: Record<string, unknown> = {}): Promise<void> {
  try {
    const { default: Notifications } = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null,
    });
  } catch {}
}

// ── Main processing function ──────────────────────────────────────────────────

export interface ShareUploadResult {
  dokument: Dokument;
  rawText: string;
}

export async function processSharedFile(
  uri: string,
  alleDocs: Dokument[],
): Promise<ShareUploadResult | null> {
  const fileType = detectFileType(uri);
  const fileName = extractFileNameFromUri(uri);

  // Step 1 — immediate feedback
  await fireImmediate(
    'Dokument erhalten — analysiere…',
    fileName,
    { type: 'share_processing' },
  );

  try {
    let rawText = '';

    if (fileType === 'image') {
      // Convert image to base64 and run Vision OCR
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const result = await extractTextFromImage(base64);
      rawText = result?.text ?? '';
    } else if (fileType === 'pdf') {
      // For PDFs: try to read as base64 and extract any embedded text
      // Full PDF text extraction requires a native module — here we create a
      // document record that the user can enrich from the detail screen.
      rawText = '';
    } else {
      // Try to read as plain text
      try {
        rawText = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
        rawText = rawText.slice(0, 5000);  // cap at 5k chars
      } catch {}
    }

    // Step 2 — run analysis pipeline
    const visionResult = analysiereText(rawText);
    const autoFillResult = runSmartAutoFill(visionResult, rawText);
    const categoryResult = runSmartCategorization(visionResult, rawText);

    if (categoryResult.confidence >= 70) {
      applyCategoryToVisionResult(visionResult, categoryResult);
      autoFillResult.extracted.typ = categoryResult.typ;
      const typField = autoFillResult.fields.find(f => f.key === 'typ');
      if (typField) { typField.wert = categoryResult.typ; typField.confidenceScore = categoryResult.confidence; }
    }

    const merged = mergeAutoFillIntoDokument(autoFillResult, {});
    const documentId = generateId();

    const dokument: Dokument = {
      id:              documentId,
      titel:           fileName.replace(/\.(pdf|jpe?g|png|heic)$/i, '') || `${merged.typ} — Geteilt`,
      typ:             String(merged.typ || 'Sonstiges'),
      absender:        String(merged.absender || 'Unbekannter Absender'),
      zusammenfassung: rawText.length > 0 ? visionResult.zusammenfassung ?? null : null,
      kurzfassung:     null,
      warnung:         merged.risiko === 'hoch' ? 'Bitte innerhalb der Frist handeln.' : null,
      betrag:          merged.betrag ?? null,
      waehrung:        '€',
      frist:           merged.frist ?? null,
      risiko:          merged.risiko ?? 'niedrig',
      aktionen:        visionResult.aktionen ?? [],
      datum:           new Date().toISOString(),
      gelesen:         false,
      erledigt:        false,
      uri:             uri,
      rohText:         rawText || null,
    };

    // Step 3 — value-first "done" notification
    const notifContent = buildUploadNotificationContent(dokument, alleDocs);
    await fireImmediate(notifContent.title, notifContent.body, { dokId: documentId, type: 'upload' });

    return { dokument, rawText };
  } catch (e) {
    console.warn('[ShareUpload] error', e);
    await fireImmediate('Fehler beim Analysieren', fileName);
    return null;
  }
}

// ── URI normalisation (content:// → file://) ─────────────────────────────────

export async function normaliseSharedUri(uri: string): Promise<string | null> {
  if (!uri) return null;

  // Already a file:// — use as-is
  if (uri.startsWith('file://')) return uri;

  // content:// — copy to cache directory first
  if (uri.startsWith('content://')) {
    try {
      const ext = detectFileType(uri) === 'pdf' ? '.pdf' : '.jpg';
      const dest = `${FileSystem.cacheDirectory}briefpilot_share_${Date.now()}${ext}`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      return dest;
    } catch { return null; }
  }

  return uri;
}
