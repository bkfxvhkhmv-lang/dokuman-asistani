import { scanT } from '@/i18n/scanStrings';

describe('scanT', () => {
  it('returns localized Turkish value when key exists', () => {
    expect(scanT('tr', 'scan.next_step')).toBe('Sonraki adım');
  });

  it('falls back to English when language is unknown', () => {
    expect(scanT('xx', 'scan.next_step')).toBe('Next step');
  });

  it('returns key itself when key is missing in dictionaries', () => {
    expect(scanT('de', 'scan.nonexistent_key')).toBe('scan.nonexistent_key');
  });

  it('interpolates variables in templates', () => {
    expect(scanT('tr', 'scan.archived_message', { count: '3 Seite' })).toBe('3 Seite arsive eklendi.');
  });
});
