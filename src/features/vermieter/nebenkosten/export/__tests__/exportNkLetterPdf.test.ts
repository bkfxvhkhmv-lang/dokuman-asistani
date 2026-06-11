/**
 * D-3.4a — NK letter PDF export helper tests
 */

const mockPrintToFileAsync = jest.fn();
const mockShareAsync = jest.fn();
const mockIsAvailableAsync = jest.fn();
const mockCopyAsync = jest.fn();
const mockGetInfoAsync = jest.fn();

jest.mock('expo-print', () => ({
  printToFileAsync: (...args: unknown[]) => mockPrintToFileAsync(...args),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: (...args: unknown[]) => mockIsAvailableAsync(...args),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock/Documents/',
  cacheDirectory: 'file:///mock/Cache/',
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
}));

import {
  createNkLetterPdf,
  shareNkLetterPdf,
} from '@/features/vermieter/nebenkosten/export/exportNkLetterPdf';

beforeEach(() => {
  jest.clearAllMocks();
  mockPrintToFileAsync.mockResolvedValue({ uri: 'file:///mock/temp-print.pdf' });
  mockGetInfoAsync.mockResolvedValue({ exists: true, size: 2048 });
  mockCopyAsync.mockResolvedValue(undefined);
  mockIsAvailableAsync.mockResolvedValue(true);
  mockShareAsync.mockResolvedValue(undefined);
});

describe('createNkLetterPdf', () => {
  it('calls printToFileAsync with HTML containing letter text', async () => {
    const letter = 'Mieter: Max Mustermann\nSumme: 100,00 €';
    const result = await createNkLetterPdf(letter);

    expect(result.ok).toBe(true);
    expect(mockPrintToFileAsync).toHaveBeenCalledTimes(1);
    const call = mockPrintToFileAsync.mock.calls[0][0];
    expect(call.base64).toBe(false);
    expect(call.html).toContain('Nebenkostenabrechnung');
    expect(call.html).toContain('Max Mustermann');
  });

  it('copies PDF to documentDirectory with briefpilot-nebenkosten prefix', async () => {
    const result = await createNkLetterPdf('Inhalt');

    expect(result.ok).toBe(true);
    expect(mockCopyAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'file:///mock/temp-print.pdf',
        to: expect.stringMatching(/^file:\/\/\/mock\/Documents\/briefpilot-nebenkosten-\d+\.pdf$/),
      }),
    );
    if (result.ok) {
      expect(result.uri).toMatch(/briefpilot-nebenkosten-\d+\.pdf$/);
    }
  });

  it('returns ok:false on print error', async () => {
    mockPrintToFileAsync.mockRejectedValueOnce(new Error('print failed'));
    const result = await createNkLetterPdf('Inhalt');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('print failed');
    }
  });

  it('returns ok:false when PDF is too small', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, size: 10 });
    const result = await createNkLetterPdf('Inhalt');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('BRIEFPILOT_NK_PDF_TOO_SMALL');
    }
  });
});

describe('shareNkLetterPdf', () => {
  it('calls shareAsync with application/pdf mime type', async () => {
    const result = await shareNkLetterPdf('Briefinhalt');

    expect(result.ok).toBe(true);
    expect(mockShareAsync).toHaveBeenCalledWith(
      expect.stringMatching(/briefpilot-nebenkosten-\d+\.pdf$/),
      {
        mimeType: 'application/pdf',
        dialogTitle: 'Nebenkostenabrechnung teilen',
      },
    );
  });

  it('returns ok:false when sharing is unavailable', async () => {
    mockIsAvailableAsync.mockResolvedValueOnce(false);
    const result = await shareNkLetterPdf('Inhalt');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('BRIEFPILOT_NK_SHARING_UNAVAILABLE');
    }
  });

  it('returns ok:false when shareAsync throws', async () => {
    mockShareAsync.mockRejectedValueOnce(new Error('share failed'));
    const result = await shareNkLetterPdf('Inhalt');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('share failed');
    }
  });
});
