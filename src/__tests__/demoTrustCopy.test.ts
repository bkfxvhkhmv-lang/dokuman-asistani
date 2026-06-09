import { t } from '@/i18n/translations';

describe('demo.trust_label', () => {
  it('returns German copy without exposing the raw key', () => {
    const label = t('de', 'demo.trust_label');
    expect(label).toBe('Demo-Dokument — keine echten persönlichen Daten.');
    expect(label).not.toMatch(/^demo\./);
  });

  it('does not leak Turkish into German UI', () => {
    expect(t('de', 'demo.trust_label')).not.toMatch(/belge|içermez/i);
  });

  it('falls back to German when language is unknown', () => {
    expect(t('xx', 'demo.trust_label')).toBe('Demo-Dokument — keine echten persönlichen Daten.');
  });

  it('localizes for supported languages', () => {
    expect(t('en', 'demo.trust_label')).toBe('Demo document — no real personal data.');
    expect(t('tr', 'demo.trust_label')).toBe('Demo belge — gerçek kişisel veri içermez.');
  });
});
