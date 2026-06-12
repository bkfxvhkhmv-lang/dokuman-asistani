import type { Dokument } from '@/store';

/**
 * Merge an OCR MVP draft document into an existing saved document.
 *
 * Preserves user edits and document identity (id, uri, pages, import date)
 * while replacing all AI/OCR-derived fields with the fresh analysis.
 */
export function buildAnalyzedDocumentUpdate(
  existing: Dokument,
  draft: Dokument,
): Dokument {
  return {
    ...draft,
    id: existing.id,
    uri: existing.uri,
    fileRelativePath: existing.fileRelativePath,
    pages: existing.pages,
    // Preserve the original import/save timestamp; draft.datum is just the
    // analysis completion time and would be confusing as the document date.
    datum: existing.datum,
    // Preserve user state and edits made before analysis.
    gelesen: existing.gelesen,
    erledigt: existing.erledigt,
    favorit: existing.favorit,
    etiketten: existing.etiketten,
    customTitle: existing.customTitle,
    userOrdner: existing.userOrdner,
    aufgaben: existing.aufgaben,
    unsignedUri: existing.unsignedUri,
    signedPreviewUri: existing.signedPreviewUri,
  };
}
