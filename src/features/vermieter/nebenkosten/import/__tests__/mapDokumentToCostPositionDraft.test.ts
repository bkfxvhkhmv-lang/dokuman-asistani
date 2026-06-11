/**
 * D-3.5b — mapDokumentToCostPositionDraft tests
 */

import { mapDokumentToCostPositionDraft } from '@/features/vermieter/nebenkosten/import/mapDokumentToCostPositionDraft';
import type { NkDokumentImportSource } from '@/features/vermieter/nebenkosten/import/types';

function makeSource(overrides?: Partial<NkDokumentImportSource>): NkDokumentImportSource {
  return {
    id: 'dok-1',
    betrag: null,
    ...overrides,
  };
}

describe('mapDokumentToCostPositionDraft', () => {
  it('converts amount 123.45 to 12345 cents', () => {
    const result = mapDokumentToCostPositionDraft(makeSource({ betrag: 123.45 }));
    expect(result.totalCents).toBe(12345);
    expect(result.needsUserInput.amount).toBe(false);
  });

  it('returns null totalCents and amount needsUserInput when betrag missing', () => {
    const result = mapDokumentToCostPositionDraft(makeSource({ betrag: null }));
    expect(result.totalCents).toBeNull();
    expect(result.needsUserInput.amount).toBe(true);
  });

  it('defaults currency to EUR when waehrung is missing', () => {
    const result = mapDokumentToCostPositionDraft(makeSource({ betrag: 10 }));
    expect(result.currency).toBe('EUR');
  });

  it('builds description from absender and typ', () => {
    const result = mapDokumentToCostPositionDraft(
      makeSource({ absender: 'Stadtwerke', typ: 'Rechnung' }),
    );
    expect(result.descriptionDe).toBe('Stadtwerke — Rechnung');
  });

  it('uses fallback description when no absender or summary', () => {
    const result = mapDokumentToCostPositionDraft(makeSource());
    expect(result.descriptionDe).toBe('Kostenposition aus Dokument');
  });

  it('suggests heizung for heating-related text', () => {
    const result = mapDokumentToCostPositionDraft(
      makeSource({ rohText: 'Abrechnung Heizkosten 2024' }),
    );
    expect(result.suggestedCategoryKey).toBe('heizung');
    expect(result.suggestedIncludeInCalculation).toBe(true);
  });

  it('suggests wasserversorgung for water text', () => {
    const result = mapDokumentToCostPositionDraft(
      makeSource({ rohText: 'Kosten Wasserversorgung Januar' }),
    );
    expect(result.suggestedCategoryKey).toBe('wasserversorgung');
  });

  it('suggests entwaesserung for abwasser text', () => {
    const result = mapDokumentToCostPositionDraft(
      makeSource({ rohText: 'Abwassergebühren Q1' }),
    );
    expect(result.suggestedCategoryKey).toBe('entwaesserung');
  });

  it('suggests muellbeseitigung for müll text', () => {
    const result = mapDokumentToCostPositionDraft(
      makeSource({ rohText: 'Müllbeseitigung Haus 3' }),
    );
    expect(result.suggestedCategoryKey).toBe('muellbeseitigung');
  });

  it('returns null category for unknown text', () => {
    const result = mapDokumentToCostPositionDraft(
      makeSource({ rohText: 'Allgemeine Verwaltungsmitteilung' }),
    );
    expect(result.suggestedCategoryKey).toBeNull();
    expect(result.suggestedIncludeInCalculation).toBeNull();
  });

  it('always requires user input for categoryKey, scope, unitId, allocationKey', () => {
    const result = mapDokumentToCostPositionDraft(
      makeSource({ betrag: 50, rohText: 'Heizkosten' }),
    );
    expect(result.needsUserInput.categoryKey).toBe(true);
    expect(result.needsUserInput.scope).toBe(true);
    expect(result.needsUserInput.unitId).toBe(true);
    expect(result.needsUserInput.allocationKey).toBe(true);
  });

  it('does not mutate input', () => {
    const source = makeSource({
      betrag: 99.99,
      absender: 'Versorger',
      typ: 'Rechnung',
      rohText: 'Heizung',
    });
    const snapshot = JSON.stringify(source);
    mapDokumentToCostPositionDraft(source);
    expect(JSON.stringify(source)).toBe(snapshot);
  });

  it('sets sourceDokId and sourceMeta from input', () => {
    const result = mapDokumentToCostPositionDraft(
      makeSource({
        id: 'doc-abc',
        absender: 'Hausverwaltung',
        dokumentDatum: '2024-06-01',
        typ: 'Rechnungen',
        subtyp: 'nebenkosten',
        confidence: 0.91,
      }),
    );
    expect(result.sourceDokId).toBe('doc-abc');
    expect(result.sourceMeta).toEqual({
      absender: 'Hausverwaltung',
      dokumentDatum: '2024-06-01',
      typ: 'Rechnungen',
      subtyp: 'nebenkosten',
      confidence: 0.91,
    });
  });
});
