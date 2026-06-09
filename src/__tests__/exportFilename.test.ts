import { buildHumanExportBasename, buildPdfExportBasename } from '@/utils/exportFilename';

describe('buildHumanExportBasename', () => {
  it('builds sender + type + month filename when metadata is good', () => {
    expect(buildHumanExportBasename({
      sender: 'Vodafone',
      title: 'Vodafone Rechnung',
      type: 'Rechnung',
      date: '2024-07-09',
    })).toBe('Vodafone_Rechnung_2024-07');
  });

  it('uses due date precision for authority-style documents', () => {
    expect(buildHumanExportBasename({
      sender: 'Gemeinde Schmelz',
      title: 'Verwarnung',
      type: 'Behörden / Amt',
      date: '2026-02-01',
      dueDate: '2026-02-12',
    })).toBe('Gemeinde_Schmelz_Behorden_Amt_12-02-2026');
  });

  it('falls back to title when sender is unknown', () => {
    expect(buildHumanExportBasename({
      sender: 'Unbekannt',
      title: 'Vodafone%20Rechnung.pdf',
      type: 'Rechnung',
      date: '2024-07-09',
    })).toBe('Vodafone_Rechnung_2024-07');
  });

  it('falls back to generic document name when metadata is weak', () => {
    expect(buildHumanExportBasename({
      sender: '',
      title: '',
      type: '',
      date: '2026-05-30',
    })).toBe('Dokument_30-05-2026');
  });
});

describe('buildPdfExportBasename', () => {
  it('humanizes saved document export basenames', () => {
    expect(buildPdfExportBasename({
      id: '1',
      titel: 'Vodafone%20Rechnung.pdf',
      absender: 'Vodafone',
      typ: 'Rechnung',
      datum: '2024-07-09',
      frist: null,
    } as any)).toBe('Vodafone_Rechnung_2024-07');
  });
});
