/**
 * D-3.4a — NK letter PDF creation and share (expo-print + FileSystem + expo-sharing)
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { buildNkLetterHtml } from './letterHtml';
import type { NkPdfExportResult } from './types';

const MIN_REASONABLE_PDF_BYTES = 400;
const PDF_FILENAME_PREFIX = 'briefpilot-nebenkosten-';
const SHARE_DIALOG_TITLE = 'Nebenkostenabrechnung teilen';

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

async function assertPdfLooksValid(uri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri, { size: true } as Parameters<
    typeof FileSystem.getInfoAsync
  >[1]);
  const size = typeof (info as { size?: number }).size === 'number' ? (info as { size: number }).size : 0;
  if (!size || size < MIN_REASONABLE_PDF_BYTES) {
    throw new Error('BRIEFPILOT_NK_PDF_TOO_SMALL');
  }
}

function buildNkPdfDestUri(documentDirectory: string): string {
  return `${documentDirectory}${PDF_FILENAME_PREFIX}${Date.now()}.pdf`;
}

/**
 * Renders plain-text letter HTML to a PDF file in documentDirectory.
 */
export async function createNkLetterPdf(letterPlainText: string): Promise<NkPdfExportResult> {
  try {
    const html = buildNkLetterHtml(letterPlainText);
    const { uri: tempUri } = await Print.printToFileAsync({ html, base64: false });

    const documentDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
    if (!documentDirectory) {
      await assertPdfLooksValid(tempUri);
      return { ok: true, uri: tempUri };
    }

    const destUri = buildNkPdfDestUri(documentDirectory);
    let finalUri = tempUri;
    try {
      await FileSystem.copyAsync({ from: tempUri, to: destUri });
      finalUri = destUri;
    } catch {
      // copy failed — fall back to temp print URI
    }

    await assertPdfLooksValid(finalUri);
    return { ok: true, uri: finalUri };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

/**
 * Creates a PDF from plain-text letter content and opens the native share sheet.
 */
export async function shareNkLetterPdf(letterPlainText: string): Promise<NkPdfExportResult> {
  try {
    const created = await createNkLetterPdf(letterPlainText);
    if (!created.ok) {
      return created;
    }

    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, error: new Error('BRIEFPILOT_NK_SHARING_UNAVAILABLE') };
    }

    await Sharing.shareAsync(created.uri, {
      mimeType: 'application/pdf',
      dialogTitle: SHARE_DIALOG_TITLE,
    });

    return { ok: true, uri: created.uri };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
