import { useCallback, useState } from 'react';
import { analysiereText } from '@/services/visionApi';
import { analyzeDocument } from '@/core/classification';
import { enqueueV4Upload } from '@/services/v4EnqueueUpload';
import { generateId, scheduleDeadlineNotification } from '@/utils';
import { persistScanFiles } from '@/modules/scanner/storage/scanFileStorage';
import type { Dokument, LernRegel, ScannedPage } from '@/store';
import { buildOfflineFallbackTitle } from '@/utils/offlineFallbackTitle';
import { normalizeAndRefineTyp } from '@/product/canonicalDocTypes';
import { wendeLernRegelnAn } from '@/utils/learningRules';

export function useDocumentPipeline(
  dispatch: (action: any) => void,
  getLernRegeln?: () => LernRegel[],
  getExistingDocs?: () => Dokument[],
) {
  const [isSaving, setIsSaving] = useState(false);
  const [flyingCardUri, setFlyingCardUri] = useState<string | null>(null);

  /**
   * Optimistic dispatch: adds a placeholder card to the store immediately,
   * before OCR completes. Returns the temp document ID so the caller can
   * update it with real data via finalizeDocument({ optimisticId }).
   */
  const dispatchOptimistic = useCallback((pages: Array<{ uri: string }>) => {
    const tempId = generateId();
    // Optimistic placeholder — bu sayfalar henuz cacheDirectory'de;
    // finalizeDocument cagrildiginda persisted versiyonlariyla degistirilirler.
    const tempPages: ScannedPage[] = pages.map((p, i) => ({
      id:        generateId(),
      uri:       p.uri,
      order:     i + 1,
      rotation:  0 as const,
      createdAt: new Date().toISOString(),
    }));
    dispatch({
      type: 'ADD_DOKUMENT',
      payload: {
        id:             tempId,
        titel:          'Wird analysiert…',
        typ:            'Sonstiges',
        absender:       'Unbekannt',
        zusammenfassung:'Dokument wird gerade verarbeitet.',
        kurzfassung:    null,
        warnung:        null,
        betrag:         null,
        waehrung:       '€',
        frist:          null,
        risiko:         'niedrig',
        aktionen:       [],
        datum:          new Date().toISOString(),
        gelesen:        false,
        erledigt:       false,
        uri:            tempPages[0]?.uri || null,
        pages:          tempPages,
        rohText:        null,
        confidence:     null,
        versionen:      [],
        aufgaben:       [],
        etiketten:      [],
        favorit:        false,
        isOptimistic:   true,
      },
    });
    return tempId;
  }, [dispatch]);

  const finalizeDocument = useCallback(async ({
    rawText,
    confidence,
    pages,
    optimisticId,
  }: {
    rawText:      string;
    confidence:   number | null;
    pages:        Array<{ uri: string }>;
    optimisticId?: string;   // replace this placeholder doc instead of creating new
  }) => {
    setIsSaving(true);
    try {
      const analysis = analysiereText(rawText);
      // Augment with core classifier: better type detection + risk scoring
      const coreAnalysis = analyzeDocument(rawText);
      // Core classifier wins on type/risk if confidence is higher
      if (coreAnalysis.confidence > 60) {
        if (!analysis.typ || analysis.typ === 'Sonstiges') analysis.typ = coreAnalysis.type;
        analysis.risiko = coreAnalysis.risk;
        if (coreAnalysis.extractedAmount && !analysis.betrag) analysis.betrag = coreAnalysis.extractedAmount;
        if (coreAnalysis.extractedIban && !analysis.iban) analysis.iban = coreAnalysis.extractedIban;
        if (coreAnalysis.extractedSender && !analysis.absender) analysis.absender = coreAnalysis.extractedSender;
      }
      const documentId = optimisticId ?? generateId();

      // ── Kalıcı dosya saklama ───────────────────────────────────────────
      // OCR'in optimize ettigi sayfalar henuz cacheDirectory'de.
      // Belge store'a yazilmadan once dosyalari kalici klasore kopyala
      // ki uygulama bir sonraki acilista hala erisebilsin.
      let persistedPages: ScannedPage[] = [];
      try {
        persistedPages = await persistScanFiles(documentId, pages.map(p => p.uri));
      } catch (e) {
        // Cache URIs must not reach the store — dead paths cause blank previews.
        // Log the failure and save without pages; caller sees empty preview state.
        console.error('[useDocumentPipeline] persistScanFiles failed — document saved without preview', e);
        persistedPages = [];
      }

      const leadPage = persistedPages[0];

      let typResolved = normalizeAndRefineTyp(String(analysis.typ ?? 'Sonstiges'), rawText);
      const absResolved = analysis.absender || 'Unbekannt';

      const { changes } = wendeLernRegelnAn(
        { typ: typResolved, absender: absResolved },
        ((getLernRegeln?.() ?? []) as any) ?? [],
      );
      if (changes.typ) typResolved = normalizeAndRefineTyp(changes.typ, rawText);
      const learntOrdner = changes.userOrdner?.trim?.() ?? null;

      const isNeedsReview = !rawText.trim();
      const titel = isNeedsReview
        ? buildOfflineFallbackTitle({ source: 'scan', importDate: new Date(), existingDocs: getExistingDocs?.() ?? [] })
        : `${typResolved} — ${absResolved.slice(0, 30)}`;

      const documentPayload = {
        id: documentId,
        titel,
        typ: typResolved,
        absender: absResolved,
        zusammenfassung: analysis.zusammenfassung,
        kurzfassung: analysis.kurzfassung || null,
        warnung: analysis.risiko === 'hoch'
          ? 'Bitte reagieren Sie innerhalb der Frist, um Zusatzkosten zu vermeiden.'
          : null,
        betrag: analysis.betrag ?? null,
        waehrung: '€',
        frist: analysis.frist ?? null,
        risiko: (analysis.risiko || 'niedrig') as 'hoch' | 'mittel' | 'niedrig',
        aktionen: [...new Set([...(analysis.aktionen || []), 'mail'])],
        datum: new Date().toISOString(),
        gelesen: false,
        erledigt: false,
        uri:              leadPage?.uri || null,
        fileRelativePath: leadPage?.relativePath ?? null,
        pages:            persistedPages,
        rohText: rawText,
        iban: analysis.iban || null,
        confidence: confidence ?? null,
        importSource: 'scan' as const,
        ...(learntOrdner ? { userOrdner: learntOrdner } : {}),
      };

      // If we had an optimistic placeholder, replace it; otherwise add new
      dispatch({
        type:    optimisticId ? 'UPDATE_DOKUMENT' : 'ADD_DOKUMENT',
        payload: optimisticId
          ? { ...documentPayload, isOptimistic: false }
          : documentPayload,
      });
      // Trigger flying card animation with the lead image
      if (leadPage?.uri) setFlyingCardUri(leadPage.uri);

      if (documentPayload.frist) {
        scheduleDeadlineNotification(documentPayload).catch(() => null);
      }

      if (leadPage?.uri) {
        enqueueV4Upload(dispatch, documentId, leadPage.uri, `${documentId}.jpg`);
      }

      return documentPayload;
    } finally {
      setIsSaving(false);
    }
  }, [dispatch, getLernRegeln, getExistingDocs]);

  return {
    isSaving,
    finalizeDocument,
    dispatchOptimistic,
    flyingCardUri,
    clearFlyingCard: () => setFlyingCardUri(null),
  };
}
