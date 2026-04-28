/**
 * useSmartDocumentPipeline — V12 AI-first scan pipeline
 *
 * Replaces useDocumentPipeline with:
 * 1. analysiereText (V6 OCR)
 * 2. runSmartAutoFill v2 (field extraction + confidence)
 * 3. runSmartCategorization v2 (type + subtyp + institution)
 * 4. Show AutoFillReviewModal for user confirmation
 * 5. Save confirmed document
 *
 * Hybrid: works 100% offline, backend enrichment when online.
 */

import { useCallback, useState } from 'react';
import { analysiereText } from '../services/visionApi';
import { runSmartAutoFill, mergeAutoFillIntoDokument, type AutoFillResult, type ExtractedFields } from '../services/SmartAutoFillService';
import { runSmartCategorization, applyCategoryToVisionResult, type CategoryResult } from '../services/SmartCategorizationService';
import { uploadDocumentV4 } from '../services/v4Api';
import { generateId, scheduleDeadlineNotification } from '../utils';
import type { Dokument } from '../store';

export interface SmartPipelineState {
  isAnalyzing: boolean;
  isSaving: boolean;
  showReview: boolean;
  autoFillResult: AutoFillResult | null;
  categoryResult: CategoryResult | null;
  pendingPages: Array<{ uri: string }>;
  pendingRawText: string;
  pendingConfidence: number | null;
}

const INITIAL: SmartPipelineState = {
  isAnalyzing:      false,
  isSaving:         false,
  showReview:       false,
  autoFillResult:   null,
  categoryResult:   null,
  pendingPages:     [],
  pendingRawText:   '',
  pendingConfidence:null,
};

export function useSmartDocumentPipeline(dispatch: (action: any) => void) {
  const [state, setState] = useState<SmartPipelineState>(INITIAL);

  // Step 1: Run AI analysis → open review modal
  const analyzeAndReview = useCallback(async ({
    rawText,
    confidence,
    pages,
  }: {
    rawText: string;
    confidence: number | null;
    pages: Array<{ uri: string }>;
  }) => {
    setState(s => ({ ...s, isAnalyzing: true }));
    try {
      // V6 OCR base analysis
      const visionResult = analysiereText(rawText);

      // V12: Auto-Fill v2
      const autoFillResult = runSmartAutoFill(visionResult, rawText);

      // V12: Categorization v2 (may override typ)
      const categoryResult = runSmartCategorization(visionResult, rawText);

      // If categorization is more confident, apply it
      if (categoryResult.confidence >= 70) {
        applyCategoryToVisionResult(visionResult, categoryResult);
        autoFillResult.extracted.typ = categoryResult.typ;
        // Update the typ field in the fields array
        const typField = autoFillResult.fields.find(f => f.key === 'typ');
        if (typField) {
          typField.wert = categoryResult.typ;
          typField.confidenceScore = categoryResult.confidence;
        }
      }

      setState(s => ({
        ...s,
        isAnalyzing: false,
        showReview: true,
        autoFillResult,
        categoryResult,
        pendingPages: pages,
        pendingRawText: rawText,
        pendingConfidence: confidence,
      }));
    } catch (err) {
      setState(s => ({ ...s, isAnalyzing: false }));
      throw err;
    }
  }, []);

  // Step 2: User confirmed edits → save document
  const confirmAndSave = useCallback(async (userEdits: Partial<ExtractedFields>) => {
    const { autoFillResult, pendingPages, pendingRawText, pendingConfidence } = state;
    if (!autoFillResult) return null;

    setState(s => ({ ...s, isSaving: true, showReview: false }));

    try {
      // Merge AI result + user edits
      const merged = mergeAutoFillIntoDokument(autoFillResult, userEdits);
      const leadPage = pendingPages[0];
      const documentId = generateId();

      const documentPayload: Dokument = {
        id:             documentId,
        titel:          String(merged.titel || `${merged.typ} — ${(merged.absender || 'Unbekannt').slice(0, 30)}`),
        typ:            String(merged.typ || 'Sonstiges'),
        absender:       String(merged.absender || 'Unbekannt'),
        zusammenfassung:buildZusammenfassung(merged, pendingRawText),
        kurzfassung:    buildKurzfassung(merged),
        warnung:        merged.risiko === 'hoch' ? 'Bitte reagieren Sie innerhalb der Frist.' : null,
        betrag:         merged.betrag ?? null,
        waehrung:       '€',
        frist:          merged.frist ?? null,
        risiko:         (merged.risiko || 'niedrig') as 'hoch' | 'mittel' | 'niedrig',
        aktionen:       [...new Set([...(merged.aktionen || []), 'mail'])],
        datum:          new Date().toISOString(),
        gelesen:        false,
        erledigt:       false,
        uri:            leadPage?.uri || null,
        pages:          pendingPages,
        rohText:        pendingRawText,
        confidence:     pendingConfidence ?? null,
        versionen:      [],
        aufgaben:       [],
        etiketten:      [],
        favorit:        false,
        // Extended V12 fields
        ...(merged.iban          ? { iban: merged.iban }                     : {}),
        ...(merged.aktenzeichen  ? { aktenzeichen: merged.aktenzeichen }     : {}),
        ...(merged.kundennr      ? { kundennr: merged.kundennr }             : {}),
        ...(merged.rechnungsnr   ? { rechnungsnr: merged.rechnungsnr }       : {}),
        ...(merged.vertragsnr    ? { vertragsnr: merged.vertragsnr }         : {}),
        ...(merged.zahlungszweck ? { zahlungszweck: merged.zahlungszweck }   : {}),
      } as Dokument;

      dispatch({ type: 'ADD_DOKUMENT', payload: documentPayload });

      if (documentPayload.frist) {
        scheduleDeadlineNotification(documentPayload).catch(() => null);
      }

      // Backend enrichment — non-blocking (hybrid: online-only)
      if (leadPage?.uri) {
        uploadDocumentV4(leadPage.uri, `${documentId}.jpg`)
          .then(result => {
            if (result?.id) dispatch({ type: 'UPDATE_DOKUMENT', payload: { id: documentId, v4DocId: result.id } });
          })
          .catch(() => null);
      }

      setState(INITIAL);
      return documentPayload;
    } finally {
      setState(s => ({ ...s, isSaving: false }));
    }
  }, [state, dispatch]);

  const dismissReview = useCallback(() => {
    setState(INITIAL);
  }, []);

  return {
    ...state,
    analyzeAndReview,
    confirmAndSave,
    dismissReview,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildZusammenfassung(merged: Partial<ExtractedFields>, rohText: string): string {
  const typ      = merged.typ      || 'Sonstiges';
  const absender = merged.absender || 'Unbekannt';
  const betrag   = merged.betrag   ? `${(merged.betrag as number).toFixed(2).replace('.', ',')} €` : null;
  const frist    = merged.frist    ? new Date(merged.frist).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  let s = ` Dokumenttyp: ${typ}\n\n👤 Absender: ${absender}\n\n`;
  s += betrag ? `💰 Betrag: ${betrag}\n\n` : ` Betrag: Nicht erkannt\n\n`;
  s += frist  ? ` Frist: ${frist}\n\n` : ` Frist: Keine Frist erkannt\n\n`;
  if (merged.aktenzeichen) s += `📎 Aktenzeichen: ${merged.aktenzeichen}\n\n`;
  if (merged.iban) s += `🏦 IBAN: ${merged.iban}\n\n`;
  return s.trim();
}

function buildKurzfassung(merged: Partial<ExtractedFields>): string {
  const typ      = merged.typ      || 'Sonstiges';
  const absender = merged.absender || 'Unbekannt';
  const betrag   = merged.betrag   ? `${(merged.betrag as number).toFixed(2).replace('.', ',')} €` : null;
  const frist    = merged.frist    ? new Date(merged.frist).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }) : null;

  if (typ === 'Rechnung') {
    if (betrag && frist) return `${betrag} bis ${frist} an ${absender} zahlen.`;
    if (betrag) return `Rechnung über ${betrag} von ${absender}.`;
  }
  if (typ === 'Mahnung') {
    return betrag ? `Mahnung: ${betrag} sofort begleichen.` : `Mahnung von ${absender}.`;
  }
  if (typ === 'Bußgeld') {
    return betrag ? `Bußgeld ${betrag} — zahlen oder Einspruch.` : `Bußgeldbescheid von ${absender}.`;
  }
  if (frist) return `${typ} von ${absender} — Frist ${frist}.`;
  return `${typ} von ${absender}.`;
}
