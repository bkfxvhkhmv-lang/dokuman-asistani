import { isTechnicalOcrError, toUserFacingOcrMessage } from '@/features/ocr-mvp/domain/userFacingErrors';

describe('userFacingErrors', () => {
  const T = (key: string) => key;

  it('flags network request failed as technical', () => {
    expect(isTechnicalOcrError('Network request failed')).toBe(true);
  });

  it('maps technical errors to network body key', () => {
    expect(toUserFacingOcrMessage('Network request failed', T)).toBe('ocr.error.network.body');
  });

  it('uses fallback for empty messages', () => {
    expect(toUserFacingOcrMessage(null, T, 'ocr.save.error.generic')).toBe('ocr.save.error.generic');
  });
});
