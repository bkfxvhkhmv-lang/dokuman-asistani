import Constants from 'expo-constants';
import {
  getAppEnv,
  getSettingsLogoutButtonStyle,
  settingsLogoutConfirmAlertStyle,
  showSettingsDevTools,
} from '@/features/settings/settingsProduction';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { APP_ENV: 'development' } } },
}));

describe('settingsProduction', () => {
  const origDev = (global as typeof globalThis & { __DEV__?: boolean }).__DEV__;

  afterEach(() => {
    (global as typeof globalThis & { __DEV__?: boolean }).__DEV__ = origDev;
    (Constants.expoConfig as { extra: { APP_ENV: string } }).extra.APP_ENV = 'development';
  });

  describe('showSettingsDevTools', () => {
    it('is hidden in production release builds (__DEV__ false)', () => {
      (global as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
      expect(showSettingsDevTools()).toBe(false);
    });

    it('is visible in dev builds with development APP_ENV', () => {
      (global as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;
      (Constants.expoConfig as { extra: { APP_ENV: string } }).extra.APP_ENV = 'development';
      expect(showSettingsDevTools()).toBe(true);
    });

    it('is hidden when APP_ENV simulates production', () => {
      (global as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;
      (Constants.expoConfig as { extra: { APP_ENV: string } }).extra.APP_ENV = 'production';
      expect(showSettingsDevTools()).toBe(false);
    });
  });

  describe('getSettingsLogoutButtonStyle', () => {
    const colors = {
      border: '#ddd',
      bgCard: '#fff',
      text: '#111',
      primary: '#0066cc',
      primaryLight: '#e6f0ff',
      primaryDark: '#004499',
      danger: '#c00',
      dangerBorder: '#f8a',
      dangerLight: '#fee',
    };

    it('uses neutral styling for signed-in logout', () => {
      const style = getSettingsLogoutButtonStyle(false, colors);
      expect(style.borderColor).toBe(colors.border);
      expect(style.backgroundColor).toBe(colors.bgCard);
      expect(style.textColor).toBe(colors.text);
      expect(style.borderColor).not.toBe(colors.dangerBorder);
      expect(style.textColor).not.toBe(colors.danger);
    });

    it('keeps guest login CTA primary styling', () => {
      const style = getSettingsLogoutButtonStyle(true, colors);
      expect(style.backgroundColor).toBe(colors.primaryLight);
      expect(style.textColor).toBe(colors.primaryDark);
    });
  });

  describe('settingsLogoutConfirmAlertStyle', () => {
    it('is not destructive', () => {
      expect(settingsLogoutConfirmAlertStyle()).toBe('default');
    });
  });

  describe('getAppEnv', () => {
    it('reads APP_ENV from expo extra', () => {
      (Constants.expoConfig as { extra: { APP_ENV: string } }).extra.APP_ENV = 'beta';
      expect(getAppEnv()).toBe('beta');
    });
  });
});
