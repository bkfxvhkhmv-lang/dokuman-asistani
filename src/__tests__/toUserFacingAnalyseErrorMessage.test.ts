import {
  toUserFacingAnalyseErrorMessage,
  UNSUPPORTED_FILE_TYPE_MESSAGE,
} from '@/features/detail/utils/toUserFacingAnalyseErrorMessage';

describe('toUserFacingAnalyseErrorMessage', () => {
  it('maps Turkish unsupported file type message to German message', () => {
    const raw =
      'Analyse-Fehler 400: Desteklenmeyen dosya tipi: . İzin verilenler: .png, .jpeg, .jpg, .pdf';
    expect(toUserFacingAnalyseErrorMessage(raw, 'error')).toBe(
      UNSUPPORTED_FILE_TYPE_MESSAGE,
    );
  });

  it('maps English unsupported file type message to German message', () => {
    expect(
      toUserFacingAnalyseErrorMessage('Unsupported file type: .txt', 'error'),
    ).toBe(UNSUPPORTED_FILE_TYPE_MESSAGE);
  });

  it('maps missing/empty extension to German unsupported type message', () => {
    expect(
      toUserFacingAnalyseErrorMessage(
        'Analyse-Fehler 400: . İzin verilenler: .png, .jpeg, .jpg, .pdf',
        'error',
      ),
    ).toBe(UNSUPPORTED_FILE_TYPE_MESSAGE);
  });

  it('returns generic German fallback for unknown errors', () => {
    expect(toUserFacingAnalyseErrorMessage('Some random server error', 'error')).toBe(
      'Die Analyse konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.',
    );
  });

  it('returns generic German fallback for timeout', () => {
    expect(toUserFacingAnalyseErrorMessage(null, 'timeout')).toBe(
      'Die Analyse konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.',
    );
  });

  it('does not expose raw Turkish text in the UI', () => {
    const result = toUserFacingAnalyseErrorMessage(
      'Desteklenmeyen dosya tipi: foo',
      'error',
    );
    expect(result).not.toContain('Desteklenmeyen');
    expect(result).not.toContain('dosya');
    expect(result).toBe(UNSUPPORTED_FILE_TYPE_MESSAGE);
  });
});
