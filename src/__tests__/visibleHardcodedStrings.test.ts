import { readFileSync } from 'fs';
import { join } from 'path';
import { t } from '@/i18n/translations';
import { MAIN_TABS } from '@/navigation/mainTabsConfig';

const TARGET_FILES = [
  'src/features/home/modals/BudgetTargetModal.tsx',
  'src/features/auth/AuthForm.tsx',
  'src/navigation/mainTabsConfig.tsx',
];

const FORBIDDEN_VISIBLE = [
  'Budgetziele',
  'Passwort vergessen?',
  'label="Passwort"',
  "tabBarLabel: 'Dokumente'",
  "tabBarLabel: 'Suche'",
  "tabBarLabel: 'Scan'",
  "tabBarLabel: 'Einstellungen'",
];

describe('visible hardcoded P1 strings', () => {
  it('does not keep forbidden hardcoded UI strings in target files', () => {
    for (const rel of TARGET_FILES) {
      const content = readFileSync(join(process.cwd(), rel), 'utf8');
      for (const needle of FORBIDDEN_VISIBLE) {
        expect(content).not.toContain(needle);
      }
    }
  });

  it('resolves new i18n keys in German without raw keys', () => {
    expect(t('de', 'budget.targets.title')).toBe('Budgetziele');
    expect(t('de', 'auth.forgot_password')).toBe('Passwort vergessen?');
    expect(t('de', 'auth.password_label')).toBe('Passwort');
    expect(t('de', 'tab.documents')).toBe('Dokumente');
    expect(t('de', 'tab.search')).toBe('Suche');
    expect(t('de', 'tab.scan')).toBe('Scan');
    expect(t('de', 'tab.settings')).toBe('Einstellungen');
  });

  it('main tab config uses tab translation keys', () => {
    const mockT = (key: string) => key;
    const colors = {
      bgCard: '#fff',
      border: '#eee',
      primary: '#00f',
      primaryLight: '#eef',
      primaryDark: '#008',
      textTertiary: '#999',
    };
    expect(MAIN_TABS[0].options(colors, mockT).tabBarLabel).toBe('tab.documents');
    expect(MAIN_TABS[1].options(colors, mockT).tabBarLabel).toBe('tab.search');
    expect(MAIN_TABS[2].options(colors, mockT).tabBarLabel).toBe('tab.scan');
    expect(MAIN_TABS[5].options(colors, mockT).tabBarLabel).toBe('tab.settings');
  });
});
