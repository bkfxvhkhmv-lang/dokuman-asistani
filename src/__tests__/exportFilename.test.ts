jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { buildHumanExportBasename, buildPdfExportBasename, buildPageShareFilename, inferShareFileExtension } from '@/utils/exportFilename';

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

describe('inferShareFileExtension', () => {
  it('reads extension from uri path', () => {
    expect(inferShareFileExtension('file:///doc/scans/x/page-1.pdf')).toBe('.pdf');
    expect(inferShareFileExtension('file:///doc/scans/x/page-2.jpg')).toBe('.jpg');
  });

  it('defaults to pdf when unknown', () => {
    expect(inferShareFileExtension('content://media/123')).toBe('.pdf');
  });
});

describe('buildPageShareFilename', () => {
  const dok = {
    id: '1',
    titel: 'Vodafone Rechnung',
    absender: 'Vodafone',
    typ: 'Rechnung',
    datum: '2024-07-09',
    frist: null,
  } as any;

  it('uses document basename for single-page share', () => {
    expect(buildPageShareFilename({
      dok,
      pageIndex: 0,
      pageCount: 1,
      sourceUri: 'file:///doc/scans/abc/page-1.pdf',
    })).toBe('Vodafone_Rechnung_2024-07.pdf');
  });

  it('appends page suffix for multi-page share', () => {
    expect(buildPageShareFilename({
      dok,
      pageIndex: 1,
      pageCount: 3,
      sourceUri: 'file:///doc/scans/abc/page-2.jpg',
    })).toBe('Vodafone_Rechnung_2024-07_Seite_2.jpg');
  });

  it('falls back when document metadata missing', () => {
    expect(buildPageShareFilename({
      dok: null,
      pageIndex: 0,
      pageCount: 1,
      sourceUri: 'file:///doc/page-1.pdf',
    })).toBe('Dokument.pdf');
  });
});
