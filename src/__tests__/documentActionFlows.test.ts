import { buildInstitutionMailDraft } from '@/features/detail/services/documentActionFlows';
import type { Dokument } from '@/store';

function makeDok(overrides: Partial<Dokument> = {}): Dokument {
  return {
    id: 'dok-1',
    titel: '',
    typ: 'Rechnung',
    absender: 'Unbekannt',
    zusammenfassung: null,
    warnung: null,
    betrag: null,
    waehrung: 'EUR',
    frist: null,
    risiko: 'niedrig',
    aktionen: [],
    datum: '2026-05-30T10:00:00.000Z',
    gelesen: false,
    erledigt: false,
    uri: null,
    rohText: null,
    ...overrides,
  };
}

describe('buildInstitutionMailDraft', () => {
  it('uses a professional fallback subject when sender is unknown', () => {
    const draft = buildInstitutionMailDraft(makeDok());
    expect(draft.subject).toBe('Rechnung zur Prüfung');
    expect(draft.subject).not.toContain('Unbekannt');
  });

  it('uses a professional fallback body instead of attachment-only boilerplate', () => {
    const draft = buildInstitutionMailDraft(makeDok());
    expect(draft.body).toContain('Hallo,');
    expect(draft.body).toContain('im Anhang findest du die Rechnung zur Prüfung.');
    expect(draft.body).toContain('Viele Grüße');
    expect(draft.body).not.toContain('Anhang: beigefügt');
  });

  it('includes only factual hint lines when metadata exists', () => {
    const draft = buildInstitutionMailDraft(
      makeDok({ frist: '2026-02-12T00:00:00.000Z', aktenzeichen: 'AZ-42' }),
    );
    expect(draft.body).toContain('Hinweis: Frist bis Donnerstag, 12. Februar 2026 · Aktenzeichen AZ-42.');
  });

  it('uses known sender in subject when available', () => {
    const draft = buildInstitutionMailDraft(makeDok({ absender: 'Vodafone' }));
    expect(draft.subject).toBe('Vodafone — Rechnung');
  });
});
