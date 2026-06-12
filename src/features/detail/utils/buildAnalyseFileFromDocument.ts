import type { Dokument } from '@/store';
import type { OcrMvpFile } from '@/services/ocrMvpApi';

const SUPPORTED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg'] as const;
type SupportedExt = typeof SUPPORTED_EXTENSIONS[number];

const MIME_MAP: Record<SupportedExt, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

function extractExtension(value: string | null | undefined): SupportedExt | null {
  if (!value) return null;
  const match = value.match(/\.([a-zA-Z0-9]+)$/);
  if (!match) return null;
  const ext = match[1].toLowerCase();
  if (SUPPORTED_EXTENSIONS.includes(ext as SupportedExt)) {
    return ext as SupportedExt;
  }
  return null;
}

function basename(value: string): string {
  return value.split('/').pop() ?? value;
}

/**
 * Build a valid OcrMvpFile for saved-document analysis.
 *
 * Candidate order:
 * 1. dok.dateiName if it has a supported extension
 * 2. basename from dok.uri if it has a supported extension
 * 3. basename from first page uri if it has a supported extension
 * 4. dok.titel/customTitle with an extension inferred from dok.uri/pages
 * 5. otherwise null (caller should block before calling startJob)
 */
export function buildAnalyseFileFromDocument(
  dok: Pick<Dokument, 'uri' | 'dateiName' | 'titel' | 'customTitle' | 'pages'>,
): OcrMvpFile | null {
  const fileUri = dok.uri;
  if (!fileUri) return null;

  const pageUri = dok.pages?.[0]?.uri;

  // 1. dateiName with supported extension
  const dateiNameExt = extractExtension(dok.dateiName);
  if (dok.dateiName && dateiNameExt) {
    return { uri: fileUri, name: dok.dateiName, mimeType: MIME_MAP[dateiNameExt] };
  }

  // 2. basename from dok.uri
  const uriExt = extractExtension(fileUri);
  const uriBase = basename(fileUri);
  if (uriExt) {
    return { uri: fileUri, name: uriBase, mimeType: MIME_MAP[uriExt] };
  }

  // 3. basename from first page uri
  if (pageUri) {
    const pageExt = extractExtension(pageUri);
    const pageBase = basename(pageUri);
    if (pageExt) {
      return { uri: fileUri, name: pageBase, mimeType: MIME_MAP[pageExt] };
    }
  }

  // 4. title with inferred extension from uri/pages
  const inferredExt = uriExt ?? extractExtension(pageUri ?? null);
  const title = dok.customTitle?.trim() || dok.titel?.trim();
  if (title && inferredExt) {
    const cleanTitle = title.replace(/\.(pdf|png|jpe?g)$/i, '');
    return { uri: fileUri, name: `${cleanTitle}.${inferredExt}`, mimeType: MIME_MAP[inferredExt] };
  }

  return null;
}
