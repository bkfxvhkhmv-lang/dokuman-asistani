import { t } from '@/i18n/translations';
import { ONBOARDING_SLIDES } from '@/components/onboarding/onboarding.slides';

const FORBIDDEN = /Alle Daten lokal|Alle Daten bleiben|nichts wird übertragen|nur Metadaten|DSGVO-konform|Google Drive|Dropbox|Cloud-Backup ist aktiv|alles lokal/i;

describe('onboarding privacy copy', () => {
  const privatSlide = ONBOARDING_SLIDES.find(s => s.id === 'privat');
  const punkte = privatSlide?.demo?.type === 'privat' ? privatSlide.demo.punkte : [];

  it('does not hardcode forbidden privacy claims in slides', () => {
    const serialized = JSON.stringify(ONBOARDING_SLIDES);
    expect(serialized).not.toMatch(FORBIDDEN);
  });

  it('uses i18n keys for privacy slide body and bullets', () => {
    expect(privatSlide?.textKey).toBe('onboarding.privacy.body');
    expect(punkte).toHaveLength(2);
    expect(punkte[0]?.textKey).toBe('onboarding.privacy.device_loss');
    expect(punkte[1]?.textKey).toBe('onboarding.privacy.cloud_optional');
    expect(punkte.every(p => !p.text)).toBe(true);
  });

  it('returns required German copy without raw keys', () => {
    expect(t('de', 'onboarding.privacy.body')).toBe(
      'Dokumente werden auf deinem Gerät gespeichert. Für OCR- und KI-Analyse kann der Inhalt sicher an den BriefPilot-Dienst übertragen werden.',
    );
    expect(t('de', 'onboarding.privacy.device_loss')).toBe(
      'Wenn dein Gerät verloren geht oder beschädigt wird, können nicht gesicherte Dokumente verloren gehen.',
    );
    expect(t('de', 'onboarding.privacy.cloud_optional')).toBe(
      'Du kannst wichtige Dokumente zusätzlich in einem Cloud-Speicher sichern, dem du vertraust.',
    );
  });

  it('does not include forbidden claims in German onboarding strings', () => {
    const keys = [
      'onboarding.privacy.body',
      'onboarding.privacy.device_loss',
      'onboarding.privacy.cloud_optional',
    ];
    for (const key of keys) {
      expect(t('de', key)).not.toMatch(FORBIDDEN);
      expect(t('de', key)).not.toMatch(/^onboarding\./);
    }
  });
});
