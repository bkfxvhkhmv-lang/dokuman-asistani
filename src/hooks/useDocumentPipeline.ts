import { useCallback, useState } from 'react';
import { analysiereText } from '../services/visionApi';
import { analyzeDocument } from '../core/classification';
import { uploadDocumentV4 } from '../services/v4Api';
import { generateId, scheduleDeadlineNotification } from '../utils';

export function useDocumentPipeline(dispatch: (action: any) => void) {
  const [isSaving, setIsSaving] = useState(false);
  const [flyingCardUri, setFlyingCardUri] = useState<string | null>(null);

  /**
   * Optimistic dispatch: adds a placeholder card to the store immediately,
   * before OCR completes. Returns the temp document ID so the caller can
   * update it with real data via finalizeDocument({ optimisticId }).
   */
  const dispatchOptimistic = useCallback((pages: Array<{ uri: string }>) => {
    const tempId = generateId();
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
        uri:            pages[0]?.uri || null,
        pages,
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
      const leadPage   = pages[0];
      const documentId = optimisticId ?? generateId();
      const documentPayload = {
        id: documentId,
        titel: `${analysis.typ} — ${(analysis.absender || 'Unbekannt').slice(0, 30)}`,
        typ: analysis.typ,
        absender: analysis.absender || 'Unbekannt',
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
        uri: leadPage?.uri || null,
        pages,
        rohText: rawText,
        iban: analysis.iban || null,
        confidence: confidence ?? null,
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
        uploadDocumentV4(leadPage.uri, `${documentId}.jpg`)
          .then(result => {
            if (result?.id) {
              dispatch({
                type: 'UPDATE_DOKUMENT',
                payload: { id: documentId, v4DocId: result.id },
              });
            }
          })
          .catch(() => null);
      }

      return documentPayload;
    } finally {
      setIsSaving(false);
    }
  }, [dispatch]);

  return {
    isSaving,
    finalizeDocument,
    dispatchOptimistic,
    flyingCardUri,
    clearFlyingCard: () => setFlyingCardUri(null),
  };
}
