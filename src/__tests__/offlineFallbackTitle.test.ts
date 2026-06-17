import {
  buildOfflineFallbackTitle,
  countOfflineFallbacksForDay,
  formatDayKey,
  isOfflineFallbackTitle,
  parseOfflineFallbackTitle,
  shareFileTypeToImportSource,
} from '@/utils/offlineFallbackTitle';
import { isStrongTitle, resolveDocumentTitle } from '@/utils/displaySanitizer';

const FIXED_DATE = new Date('2026-06-17T14:00:00.000Z');

describe('buildOfflineFallbackTitle', () => {
  it('first scan → YYYY-MM-DD · Scan 01', () => {
    expect(buildOfflineFallbackTitle({
      source: 'scan',
      importDate: FIXED_DATE,
      existingDocs: [],
    })).toBe('2026-06-17 · Scan 01');
  });

  it('second scan same day → Scan 02', () => {
    const existingDocs = [{
      titel: '2026-06-17 · Scan 01',
      importSource: 'scan' as const,
      datum: FIXED_DATE.toISOString(),
    }];
    expect(buildOfflineFallbackTitle({
      source: 'scan',
      importDate: FIXED_DATE,
      existingDocs,
    })).toBe('2026-06-17 · Scan 02');
  });

  it('PDF same day uses separate counter → PDF 01', () => {
    const existingDocs = [{
      titel: '2026-06-17 · Scan 01',
      importSource: 'scan' as const,
      datum: FIXED_DATE.toISOString(),
    }];
    expect(buildOfflineFallbackTitle({
      source: 'pdf',
      importDate: FIXED_DATE,
      existingDocs,
    })).toBe('2026-06-17 · PDF 01');
  });

  it('photo source → Foto 01', () => {
    expect(buildOfflineFallbackTitle({
      source: 'photo',
      importDate: FIXED_DATE,
      existingDocs: [],
    })).toBe('2026-06-17 · Foto 01');
  });

  it('sequence resets on a different day', () => {
    const existingDocs = [{
      titel: '2026-06-16 · Scan 03',
      importSource: 'scan' as const,
      datum: '2026-06-16T10:00:00.000Z',
    }];
    expect(buildOfflineFallbackTitle({
      source: 'scan',
      importDate: FIXED_DATE,
      existingDocs,
    })).toBe('2026-06-17 · Scan 01');
  });

  it('counts legacy Scan vom titles via pattern match', () => {
    const existingDocs = [{
      titel: '2026-06-17 · Scan 01',
      datum: FIXED_DATE.toISOString(),
    }];
    expect(countOfflineFallbacksForDay(existingDocs, 'scan', formatDayKey(FIXED_DATE))).toBe(1);
  });
});

describe('offline fallback display integration (#142B)', () => {
  it('customTitle wins over offline fallback titel', () => {
    expect(resolveDocumentTitle({
      titel: '2026-06-17 · Scan 01',
      customTitle: 'Meine Rechnung',
      importSource: 'scan',
      typ: 'Sonstiges',
    })).toBe('Meine Rechnung');
  });

  it('strong titel is preserved over aiDisplayTitle', () => {
    expect(resolveDocumentTitle({
      titel: 'Rechnung — Vodafone',
      aiDisplayTitle: 'AI Title',
      typ: 'Rechnung',
      confidence: 80,
    })).toBe('Rechnung — Vodafone');
  });

  it('weak offline fallback yields to aiDisplayTitle', () => {
    expect(resolveDocumentTitle({
      titel: '2026-06-17 · Scan 01',
      aiDisplayTitle: 'Schornsteinfeger Rechnung',
      importSource: 'scan',
      typ: 'Sonstiges',
    })).toBe('Schornsteinfeger Rechnung');
  });

  it('offline fallback titles are weak', () => {
    expect(isStrongTitle('2026-06-17 · Scan 01')).toBe(false);
    expect(isOfflineFallbackTitle('2026-06-17 · PDF 02')).toBe(true);
  });

  it('parseOfflineFallbackTitle extracts parts', () => {
    expect(parseOfflineFallbackTitle('2026-06-17 · Foto 03')).toEqual({
      dayKey: '2026-06-17',
      source: 'photo',
      sequence: 3,
    });
  });
});

describe('shareFileTypeToImportSource', () => {
  it('maps pdf and image types', () => {
    expect(shareFileTypeToImportSource('pdf')).toBe('pdf');
    expect(shareFileTypeToImportSource('image')).toBe('photo');
    expect(shareFileTypeToImportSource('unknown')).toBe('unknown');
  });
});
