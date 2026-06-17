/**
 * #143B1 regression guard:
 *  - finalizeDocument (rawText dolu + boş) → enqueueV4Upload çağrılır
 *  - rawText boş → titel offline fallback kullanır ("Sonstiges — Unbekannt" OLMAZ)
 *  - rawText boş → importSource 'scan'
 *  - confirmAndSave (smart pipeline) → enqueueV4Upload çağrılır
 *  - archiveDocument → enqueueV4Upload ÇAĞRILMAZ (bilinçli offline)
 */

// ── Mock declarations — jest.mock çağrısından önce tanımlanmalı ────────────────

const mockEnqueueV4Upload = jest.fn();
jest.mock('@/services/v4EnqueueUpload', () => ({
  enqueueV4Upload: (...args: any[]) => mockEnqueueV4Upload(...args),
}));

const mockPersistScanFiles = jest.fn(async (dokId: string, sources: string[]) =>
  sources.map((src, i) => ({
    id:        `p-${i}`,
    uri:       `file:///doc/scans/${dokId}/page-${i + 1}.jpg`,
    order:     i + 1,
    rotation:  0 as const,
    createdAt: '2026-06-17T10:00:00.000Z',
  })),
);
jest.mock('@/modules/scanner/storage/scanFileStorage', () => ({
  persistScanFiles: (dokId: string, sources: string[]) =>
    mockPersistScanFiles(dokId, sources),
}));

jest.mock('@/services/visionApi', () => ({
  analysiereText: () => ({
    typ: 'Sonstiges',
    absender: '',
    zusammenfassung: null,
    kurzfassung: null,
    risiko: 'niedrig',
    aktionen: [],
    betrag: null,
    frist: null,
    iban: null,
  }),
}));

jest.mock('@/core/classification', () => ({
  analyzeDocument: () => ({
    confidence: 0,
    type: 'Sonstiges',
    risk: 'niedrig',
    extractedAmount: null,
    extractedIban: null,
    extractedSender: null,
  }),
}));

jest.mock('@/product/canonicalDocTypes', () => ({
  normalizeAndRefineTyp: (typ: string) => typ,
}));

jest.mock('@/utils/learningRules', () => ({
  wendeLernRegelnAn: () => ({ changes: {} }),
}));

jest.mock('@/utils', () => ({
  generateId: () => 'test-doc-id',
  scheduleDeadlineNotification: jest.fn(),
}));

jest.mock('@/services/SmartAutoFillService', () => ({
  runSmartAutoFill: () => ({
    fields: [],
    extracted: { typ: 'Sonstiges', absender: 'Unbekannt', risiko: 'niedrig', aktionen: [] },
  }),
  mergeAutoFillIntoDokument: (_result: any, edits: any) => ({
    typ: 'Sonstiges',
    absender: 'Unbekannt',
    risiko: 'niedrig',
    aktionen: [],
    betrag: null,
    frist: null,
    iban: null,
    titel: null,
    ...edits,
  }),
}));

jest.mock('@/services/SmartCategorizationService', () => ({
  runSmartCategorization: () => ({ confidence: 0, typ: 'Sonstiges' }),
  applyCategoryToVisionResult: jest.fn(),
}));

jest.mock('@/services/vision-api/summarizeText', () => ({
  erstelleKurzfassung: () => 'Testdokument',
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useDocumentPipeline } from '@/hooks/useDocumentPipeline';
import { useSmartDocumentPipeline } from '@/hooks/useSmartDocumentPipeline';
import { archiveDocument } from '@/modules/scanner/flow/archiveDocument';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePipeline(dispatch = jest.fn()) {
  let hook: ReturnType<typeof useDocumentPipeline> | null = null;
  function Harness() {
    hook = useDocumentPipeline(dispatch);
    return null;
  }
  act(() => { TestRenderer.create(<Harness />); });
  return { hook: hook!, dispatch };
}

function makeSmartPipeline(dispatch = jest.fn()) {
  // Ref pattern: Harness reassigns on every render so we always get the latest
  // hook value (including updated confirmAndSave after analyzeAndReview).
  const ref: { hook: ReturnType<typeof useSmartDocumentPipeline> | null } = { hook: null };
  function Harness() {
    ref.hook = useSmartDocumentPipeline(dispatch);
    return null;
  }
  act(() => { TestRenderer.create(<Harness />); });
  return { ref, dispatch };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── useDocumentPipeline.finalizeDocument ──────────────────────────────────────

describe('useDocumentPipeline — finalizeDocument', () => {
  it('rawText dolu → enqueueV4Upload çağrılır', async () => {
    const { hook } = makePipeline();
    await act(async () => {
      await hook.finalizeDocument({
        rawText: 'Rechnung von Telekom AG',
        confidence: 0.9,
        pages: [{ uri: 'file:///cache/scan-001.jpg' }],
      });
    });
    expect(mockEnqueueV4Upload).toHaveBeenCalledTimes(1);
  });

  it('rawText boş (needs_review) → enqueueV4Upload çağrılır', async () => {
    const { hook } = makePipeline();
    await act(async () => {
      await hook.finalizeDocument({
        rawText: '',
        confidence: null,
        pages: [{ uri: 'file:///cache/scan-002.jpg' }],
      });
    });
    expect(mockEnqueueV4Upload).toHaveBeenCalledTimes(1);
  });

  it('rawText boş → titel offline fallback formatında, "Sonstiges — Unbekannt" değil', async () => {
    const { hook, dispatch } = makePipeline();
    await act(async () => {
      await hook.finalizeDocument({
        rawText: '',
        confidence: null,
        pages: [{ uri: 'file:///cache/scan-003.jpg' }],
      });
    });
    const addCall = dispatch.mock.calls.find((c: any[]) => c[0].type === 'ADD_DOKUMENT');
    const titel: string = addCall?.[0].payload.titel ?? '';
    expect(titel).toMatch(/^\d{4}-\d{2}-\d{2} · Scan \d{2}$/);
    expect(titel).not.toBe('Sonstiges — Unbekannt');
  });

  it('rawText boş → importSource "scan"', async () => {
    const { hook, dispatch } = makePipeline();
    await act(async () => {
      await hook.finalizeDocument({
        rawText: '',
        confidence: null,
        pages: [{ uri: 'file:///cache/scan-004.jpg' }],
      });
    });
    const addCall = dispatch.mock.calls.find((c: any[]) => c[0].type === 'ADD_DOKUMENT');
    expect(addCall?.[0].payload.importSource).toBe('scan');
  });

  it('rawText dolu → importSource "scan"', async () => {
    const { hook, dispatch } = makePipeline();
    await act(async () => {
      await hook.finalizeDocument({
        rawText: 'Kontoauszug',
        confidence: 0.8,
        pages: [{ uri: 'file:///cache/scan-005.jpg' }],
      });
    });
    const addCall = dispatch.mock.calls.find((c: any[]) => c[0].type === 'ADD_DOKUMENT');
    expect(addCall?.[0].payload.importSource).toBe('scan');
  });
});

// ── useSmartDocumentPipeline — confirmAndSave ─────────────────────────────────

describe('useSmartDocumentPipeline — confirmAndSave', () => {
  it('onaylanan belge → enqueueV4Upload çağrılır', async () => {
    const { ref } = makeSmartPipeline();

    await act(async () => {
      await ref.hook!.analyzeAndReview({
        rawText: 'Rechnung',
        confidence: 0.9,
        pages: [{ uri: 'file:///cache/smart-001.jpg' }],
      });
    });

    // After analyzeAndReview re-renders, ref.hook is updated with new state
    await act(async () => {
      await ref.hook!.confirmAndSave({});
    });

    expect(mockEnqueueV4Upload).toHaveBeenCalledTimes(1);
  });
});

// ── archiveDocument — offline gate ────────────────────────────────────────────

describe('archiveDocument — offline gate', () => {
  it('enqueueV4Upload ÇAĞRILMAZ (bilinçli offline)', async () => {
    await archiveDocument({
      sourceUris: ['file:///cache/archive-001.jpg'],
      dispatch: jest.fn(),
    });
    expect(mockEnqueueV4Upload).not.toHaveBeenCalled();
  });
});
