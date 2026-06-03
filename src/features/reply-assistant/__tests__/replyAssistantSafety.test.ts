import {
  REPLY_ASSISTANT_DISCLAIMER_STORAGE_KEY,
  REPLY_ASSISTANT_GLOBAL_BANNER,
  REPLY_ASSISTANT_HIGH_RISK_BANNER,
  shouldShowHighRiskWarning,
} from '@/features/reply-assistant/domain/safety';

describe('reply assistant beta safety helpers', () => {
  it('uses a stable disclaimer storage key', () => {
    expect(REPLY_ASSISTANT_DISCLAIMER_STORAGE_KEY).toBe('reply_assistant_beta_disclaimer_seen_v1');
  });

  it('provides the expected global banner copy', () => {
    expect(REPLY_ASSISTANT_GLOBAL_BANNER).toBe(
      'Nur Entwurf • Kein Rechtsrat • Vor dem Versand selbst prüfen',
    );
  });

  it('provides the expected high-risk banner copy', () => {
    expect(REPLY_ASSISTANT_HIGH_RISK_BANNER).toContain('rechtliche oder finanzielle Folgen');
    expect(REPLY_ASSISTANT_HIGH_RISK_BANNER).toContain('Fachberatung');
  });

  it('shows high-risk warning for high risk templates', () => {
    expect(shouldShowHighRiskWarning({
      safety: { riskLevel: 'high', requiresLegalCaution: false },
    } as any)).toBe(true);
  });

  it('shows high-risk warning when legal caution is required', () => {
    expect(shouldShowHighRiskWarning({
      safety: { riskLevel: 'low', requiresLegalCaution: true },
    } as any)).toBe(true);
  });

  it('does not show high-risk warning for low-risk templates without legal caution', () => {
    expect(shouldShowHighRiskWarning({
      safety: { riskLevel: 'low', requiresLegalCaution: false },
    } as any)).toBe(false);
  });
});
