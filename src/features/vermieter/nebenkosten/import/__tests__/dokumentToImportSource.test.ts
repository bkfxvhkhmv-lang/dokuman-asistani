/**
 * D-3.5c-a — dokumentToImportSource tests
 */

import { dokumentToImportSource } from '@/features/vermieter/nebenkosten/import/dokumentToImportSource';
import type { DokumentLike } from '@/features/vermieter/nebenkosten/import/dokumentToImportSource';

function makeDok(overrides?: Partial<DokumentLike>): DokumentLike {
  return {
    id: 'dok-1',
    betrag: null,
    ...overrides,
  };
}

describe('dokumentToImportSource', () => {
  it('maps id and betrag', () => {
    const result = dokumentToImportSource(makeDok({ id: 'abc-123', betrag: 99.90 }));
    expect(result.id).toBe('abc-123');
    expect(result.betrag).toBe(99.90);
  });

  it('maps waehrung as EUR when set', () => {
    const result = dokumentToImportSource(makeDok({ waehrung: 'EUR' }));
    expect(result.waehrung).toBe('EUR');
  });

  it('defaults missing optional fields to null', () => {
    const result = dokumentToImportSource(makeDok());
    expect(result.waehrung).toBeNull();
    expect(result.absender).toBeNull();
    expect(result.datum).toBeNull();
    expect(result.dokumentDatum).toBeNull();
    expect(result.typ).toBeNull();
    expect(result.subtyp).toBeNull();
    expect(result.rohText).toBeNull();
    expect(result.zusammenfassung).toBeNull();
    expect(result.confidence).toBeNull();
  });

  it('maps string fields from input', () => {
    const result = dokumentToImportSource(
      makeDok({
        absender: 'Stadtwerke',
        datum: '2024-06-01',
        dokumentDatum: '2024-05-28',
        typ: 'Rechnung',
        subtyp: 'Nebenkosten',
        rohText: 'Heizkostenabrechnung 2024',
        zusammenfassung: 'Abrechnung für Zeitraum 01-12/2024',
        confidence: 0.87,
      }),
    );
    expect(result.absender).toBe('Stadtwerke');
    expect(result.datum).toBe('2024-06-01');
    expect(result.dokumentDatum).toBe('2024-05-28');
    expect(result.typ).toBe('Rechnung');
    expect(result.subtyp).toBe('Nebenkosten');
    expect(result.rohText).toBe('Heizkostenabrechnung 2024');
    expect(result.zusammenfassung).toBe('Abrechnung für Zeitraum 01-12/2024');
    expect(result.confidence).toBe(0.87);
  });

  it('maps title fields from input', () => {
    const result = dokumentToImportSource(
      makeDok({
        customTitle: 'Benutzer Titel',
        aiDisplayTitle: 'AI Titel',
        titel: 'Schornsteinfeger 30.',
        dateiName: 'schornsteinfeger.pdf',
      }),
    );
    expect(result.customTitle).toBe('Benutzer Titel');
    expect(result.aiDisplayTitle).toBe('AI Titel');
    expect(result.titel).toBe('Schornsteinfeger 30.');
    expect(result.dateiName).toBe('schornsteinfeger.pdf');
  });

  it('defaults missing title fields to null', () => {
    const result = dokumentToImportSource(makeDok());
    expect(result.customTitle).toBeNull();
    expect(result.aiDisplayTitle).toBeNull();
    expect(result.titel).toBeNull();
    expect(result.dateiName).toBeNull();
  });

  it('does not mutate input', () => {
    const dok = makeDok({ betrag: 50, absender: 'Test' });
    const snapshot = JSON.stringify(dok);
    dokumentToImportSource(dok);
    expect(JSON.stringify(dok)).toBe(snapshot);
  });
});
