import {
  buildProductionBriefkopf,
  finalizeLetterTextForExport,
  RECIPIENT_FALLBACK_FINANZAMT,
  RECIPIENT_FALLBACK_GENERIC,
  resolveReplyRecipient,
  senderFromBilgiler,
  SENDER_ADDRESS_PLACEHOLDER,
  SENDER_NAME_PLACEHOLDER,
} from '../productionLetterhead';

describe('productionLetterhead', () => {
  const fullProfile = {
    vorname: 'Max',
    nachname: 'Mustermann',
    strasse: 'Musterstraße 1',
    plz: '12345',
    ort: 'Berlin',
  };

  it('senderFromBilgiler uses real name and address when profile is complete', () => {
    expect(senderFromBilgiler(fullProfile)).toEqual({
      name: 'Max Mustermann',
      adresse: 'Musterstraße 1\n12345 Berlin',
    });
  });

  it('senderFromBilgiler keeps bracket placeholders when profile is missing', () => {
    expect(senderFromBilgiler()).toEqual({
      name: SENDER_NAME_PLACEHOLDER,
      adresse: SENDER_ADDRESS_PLACEHOLDER,
    });
  });

  it('resolveReplyRecipient uses known absender as Empfänger', () => {
    expect(resolveReplyRecipient({ absender: 'Finanzamt Köln' }, RECIPIENT_FALLBACK_GENERIC))
      .toBe('Finanzamt Köln');
  });

  it('resolveReplyRecipient falls back for unknown absender', () => {
    expect(resolveReplyRecipient({ absender: 'Unbekannt' }, RECIPIENT_FALLBACK_GENERIC))
      .toBe(RECIPIENT_FALLBACK_GENERIC);
  });

  it('buildProductionBriefkopf matches shared header structure', () => {
    const result = buildProductionBriefkopf({
      recipientSource: { absender: 'Finanzamt Köln' },
      recipientFallback: RECIPIENT_FALLBACK_FINANZAMT,
      bilgiler: fullProfile,
      datum: '05.06.2026',
    });
    expect(result).toBe(
      'Max Mustermann\n' +
      'Musterstraße 1\n12345 Berlin\n' +
      '\n' +
      'Finanzamt Köln\n' +
      '\n' +
      '05.06.2026\n' +
      '\n',
    );
  });

  it('finalizeLetterTextForExport replaces sender brackets when profile exists', () => {
    const raw = `${SENDER_NAME_PLACEHOLDER}\n${SENDER_ADDRESS_PLACEHOLDER}\n\nFinanzamt\n\n05.06.2026\n\n`;
    const filled = finalizeLetterTextForExport(raw, fullProfile);
    expect(filled).toContain('Max Mustermann');
    expect(filled).not.toContain(SENDER_NAME_PLACEHOLDER);
  });
});
