import { inferReplyCategory } from '@/features/reply-assistant/domain/inferReplyCategory';

describe('inferReplyCategory', () => {
  it.each([
    ['Bußgeldbescheid', undefined, undefined, 'bussgeld'],
    [undefined, 'Ordnungsamt Berlin', undefined, 'bussgeld'],
    ['Bescheid', 'Jobcenter', undefined, 'jobcenter'],
    ['Bescheid', undefined, 'Bürgergeld Antrag', 'jobcenter'],
    ['Steuerbescheid', undefined, undefined, 'finanzamt'],
    [undefined, 'Finanzamt München', undefined, 'finanzamt'],
    ['Mahnung', 'Vermieter', undefined, 'miete'],
    [undefined, undefined, 'Nebenkostenabrechnung 2023', 'miete'],
    [undefined, 'Schufa Holding', undefined, 'schufa'],
    ['Mahnschreiben', 'Inkasso GmbH', undefined, 'inkasso'],
    [undefined, 'Pfändungsgläubiger', undefined, 'inkasso'],
  ])('(%s, %s, %s) → %s', (typ, absender, titel, expected) => {
    expect(inferReplyCategory(typ, absender, titel)).toBe(expected);
  });

  it('returns undefined for unrelated document types', () => {
    expect(inferReplyCategory('Rechnung', 'Telekom', 'Handyrechnung')).toBeUndefined();
    expect(inferReplyCategory(undefined, undefined, undefined)).toBeUndefined();
    expect(inferReplyCategory('', '', '')).toBeUndefined();
  });

  it('normalises umlauts before matching', () => {
    expect(inferReplyCategory(undefined, 'Büßgeldbehörde', undefined)).toBe('bussgeld');
    expect(inferReplyCategory(undefined, 'Bußgeld', undefined)).toBe('bussgeld');
  });
});
