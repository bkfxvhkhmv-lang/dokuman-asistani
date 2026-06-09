import { SCAN_QUALITY_PRESET_IDS, getScanQualityProfile } from '@/modules/scanner/flow/scanQualityProfiles';

describe('scanQualityProfiles', () => {
  it('exposes all expected preset ids', () => {
    expect(SCAN_QUALITY_PRESET_IDS).toEqual(['auto', 'document', 'bw', 'receipt']);
  });

  it('returns auto profile with autocapture enabled', () => {
    const profile = getScanQualityProfile('auto');
    expect(profile.autoCapture).toBe(true);
    expect(profile.preferredFilter).toBe('clean');
  });

  it('returns receipt profile tuned for higher exposure', () => {
    const profile = getScanQualityProfile('receipt');
    expect(profile.exposure).toBeGreaterThan(0.1);
    expect(profile.preferredFilter).toBe('contrast');
  });
});
