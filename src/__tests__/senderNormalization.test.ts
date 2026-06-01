import {
  isWeakSender,
  normalizeCanonical,
  recoverSenderFromRohText,
  normalizeSender,
} from '@/utils/senderNormalization';

describe('isWeakSender', () => {
  it('returns true for empty string', () => expect(isWeakSender('')).toBe(true));
  it('returns true for null', () => expect(isWeakSender(null)).toBe(true));
  it('returns true for "Unbekannt"', () => expect(isWeakSender('Unbekannt')).toBe(true));
  it('returns true for "Unknown"', () => expect(isWeakSender('Unknown')).toBe(true));
  it('returns true for "Kundenservice"', () => expect(isWeakSender('Kundenservice')).toBe(true));
  it('returns true for "DIE ONLINE-VERSICHERUNG"', () => expect(isWeakSender('DIE ONLINE-VERSICHERUNG')).toBe(true));
  it('returns false for real institution', () => expect(isWeakSender('Finanzamt München')).toBe(false));
  it('returns false for Vodafone', () => expect(isWeakSender('Vodafone Deutschland GmbH')).toBe(false));
});

describe('normalizeCanonical — display name normalization', () => {
  it('Vodafone Deutschland GmbH → Vodafone', () => {
    expect(normalizeCanonical('Vodafone Deutschland GmbH')).toBe('Vodafone');
  });
  it('VODAFONE → Vodafone', () => {
    expect(normalizeCanonical('VODAFONE')).toBe('Vodafone');
  });
  it('Deutsche Telekom AG → Deutsche Telekom', () => {
    expect(normalizeCanonical('Deutsche Telekom AG')).toBe('Deutsche Telekom');
  });
  it('Telekom Deutschland GmbH → Deutsche Telekom', () => {
    expect(normalizeCanonical('Telekom Deutschland GmbH')).toBe('Deutsche Telekom');
  });
  it('DTAG → Deutsche Telekom', () => {
    expect(normalizeCanonical('DTAG')).toBe('Deutsche Telekom');
  });
  it('HUK24 AG → HUK24', () => {
    expect(normalizeCanonical('HUK24 AG')).toBe('HUK24');
  });
  it('HUK-COBURG Versicherung → HUK-COBURG', () => {
    expect(normalizeCanonical('HUK-COBURG Versicherung')).toBe('HUK-COBURG');
  });
  it('HUK COBURG AG → HUK-COBURG', () => {
    expect(normalizeCanonical('HUK COBURG AG')).toBe('HUK-COBURG');
  });
  it('Techniker Krankenkasse → Techniker Krankenkasse', () => {
    expect(normalizeCanonical('Techniker Krankenkasse')).toBe('Techniker Krankenkasse');
  });
  it('Finanzamt Saarlouis → null (keep as-is)', () => {
    expect(normalizeCanonical('Finanzamt Saarlouis')).toBeNull();
  });
  it('Landkreis Karlsruhe → null (keep as-is)', () => {
    expect(normalizeCanonical('Landkreis Karlsruhe')).toBeNull();
  });
  it('AOK Bayern → kept (null → original)', () => {
    expect(normalizeCanonical('AOK Bayern')).toBe('AOK Bayern');
  });
  it('unknown business name → null', () => {
    expect(normalizeCanonical('Müllers Bäckerei GmbH')).toBeNull();
  });
});

describe('recoverSenderFromRohText — institution recovery from OCR text', () => {
  it('rohText has Kreisjugendamt → recovers name', () => {
    const text = 'Datum: 12.05.2026\nKreisjugendamt Karlsruhe\nAmt für Jugend und Familie\n\nSehr geehrter...';
    const result = recoverSenderFromRohText(text);
    expect(result).toMatch(/kreisjugendamt karlsruhe/i);
  });

  it('rohText has Landkreis → recovers name', () => {
    const text = 'Landkreis Saarlouis\nAm Markt 1\n66740 Saarlouis';
    expect(recoverSenderFromRohText(text)).toMatch(/landkreis saarlouis/i);
  });

  it('rohText has HUK24 keyword → returns HUK24', () => {
    const text = 'Ihre HUK24 Kfz-Versicherung\nPolicenummer: 12345';
    expect(recoverSenderFromRohText(text)).toBe('HUK24');
  });

  it('rohText has DIE ONLINE-VERSICHERUNG but also HUK24 → HUK24 wins via canonical brand', () => {
    const text = 'DIE ONLINE-VERSICHERUNG\nein Unternehmen der HUK-COBURG Gruppe\nHUK24 Rechnung';
    expect(recoverSenderFromRohText(text)).toBe('HUK24');
  });

  it('rohText has Vodafone → Vodafone', () => {
    const text = 'Vodafone GmbH\nFrankfurter Str. 362\n47443 Moers';
    expect(recoverSenderFromRohText(text)).toBe('Vodafone');
  });

  it('null rohText → null', () => {
    expect(recoverSenderFromRohText(null)).toBeNull();
  });

  it('rohText with only personal name → null (no institution)', () => {
    const text = 'Sehr geehrter Herr Müller,\ndas Schreiben betrifft...';
    expect(recoverSenderFromRohText(text)).toBeNull();
  });
});

describe('normalizeSender — full orchestration', () => {
  it('strong sender passes through normalized', () => {
    expect(normalizeSender('VODAFONE GmbH')).toBe('Vodafone');
  });

  it('Finanzamt Saarlouis stays as-is (no canonical rule)', () => {
    expect(normalizeSender('Finanzamt Saarlouis')).toBe('Finanzamt Saarlouis');
  });

  it('Unbekannt + rohText with Kreisjugendamt → recovers institution', () => {
    const rohText = 'Kreisjugendamt Karlsruhe\nAmt für Jugend und Familie';
    expect(normalizeSender('Unbekannt', rohText)).toMatch(/kreisjugendamt karlsruhe/i);
  });

  it('Unbekannt + rohText with Landkreis → recovers institution', () => {
    const rohText = 'Landkreis Saarlouis\n66740 Saarlouis';
    expect(normalizeSender('Unbekannt', rohText)).toMatch(/landkreis saarlouis/i);
  });

  it('empty absender + no rohText → empty string', () => {
    expect(normalizeSender(null)).toBe('');
    expect(normalizeSender('')).toBe('');
  });

  it('strong existing sender is NOT overwritten by generic rohText', () => {
    // "Commerzbank AG" is a real specific sender
    const result = normalizeSender('Commerzbank AG', 'Service Center Mahnung Dokument');
    expect(result).toBe('Commerzbank');
  });

  it('user/person name should not become sender — personal prefix guard', () => {
    const rohText = 'Sehr geehrter Herr Müller\nHier ist Ihr Schreiben';
    expect(normalizeSender('Unbekannt', rohText)).toBe('');
  });
});

describe('BWW Energie sender normalization', () => {
  it('BWW Energie GmbH => BWW Energie (canonical)', () => {
    expect(normalizeCanonical('BWW Energie GmbH')).toBe('BWW Energie');
  });

  it('BWW Energie => BWW Energie', () => {
    expect(normalizeCanonical('BWW Energie')).toBe('BWW Energie');
  });

  it('Unbekannt + rohText contains BWW Energie GmbH => BWW Energie', () => {
    const rohText = 'BWW Energie GmbH\nRechnungsnummer: 123\nGesamtbetrag: 809,68 EUR';
    expect(normalizeSender('Unbekannt', rohText)).toBe('BWW Energie');
  });

  it('weak old sender + rohText contains BWW Energie => BWW Energie', () => {
    const rohText = 'BWW Energie\nAbschlag Gas und Strom\nKundennummer: 456';
    expect(normalizeSender('', rohText)).toBe('BWW Energie');
  });

  it('bare "BWW" alone without Energie context => no match (conservative)', () => {
    expect(normalizeCanonical('BWW')).toBeNull();
  });

  it('strong unrelated sender is not overwritten by bare BWW in rohText', () => {
    const rohText = 'BWW Vermittlung GmbH\nAndere Firma';
    expect(normalizeSender('Commerzbank AG', rohText)).toBe('Commerzbank');
  });
});
