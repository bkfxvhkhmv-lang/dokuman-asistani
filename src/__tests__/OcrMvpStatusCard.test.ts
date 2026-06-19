import { getElapsedStageIndex, getStatusCardActiveIndex } from '@/features/ocr-mvp/components/OcrMvpStatusCard';

describe('OcrMvpStatusCard stage progression', () => {
  it('advances visible stages over elapsed time', () => {
    expect(getElapsedStageIndex(0)).toBe(0);
    expect(getElapsedStageIndex(2)).toBe(1);
    expect(getElapsedStageIndex(5)).toBe(2);
    expect(getElapsedStageIndex(8)).toBe(3);
  });

  it('uses elapsed progression while upload is still pending', () => {
    expect(getStatusCardActiveIndex('uploading', 0)).toBe(0);
    expect(getStatusCardActiveIndex('uploading', 3)).toBe(1);
    expect(getStatusCardActiveIndex('uploading', 6)).toBe(2);
    expect(getStatusCardActiveIndex('uploading', 10)).toBe(3);
  });

  it('uses elapsed progression while processing', () => {
    expect(getStatusCardActiveIndex('processing', 3)).toBe(1);
    expect(getStatusCardActiveIndex('processing', 6)).toBe(2);
    expect(getStatusCardActiveIndex('processing', 10)).toBe(3);
  });

  it('stays at the initial step when analysis is not active', () => {
    expect(getStatusCardActiveIndex('idle', 10)).toBe(0);
    expect(getStatusCardActiveIndex('done', 10)).toBe(0);
    expect(getStatusCardActiveIndex('error', 10)).toBe(0);
    expect(getStatusCardActiveIndex('timeout', 10)).toBe(0);
  });
});
