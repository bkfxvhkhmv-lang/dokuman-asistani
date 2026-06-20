import Constants from 'expo-constants';

export function getAppEnv(): string {
  const extra = Constants.expoConfig?.extra as { APP_ENV?: string } | undefined;
  return extra?.APP_ENV ?? 'development';
}

/** Dev/profi/debug Settings rows — hidden in production release builds. */
export function showSettingsDevTools(): boolean {
  if (!__DEV__) return false;
  const env = getAppEnv();
  return env !== 'production' && env !== 'beta';
}

export interface LogoutButtonStyle {
  borderColor: string;
  backgroundColor: string;
  textColor: string;
}

export function getSettingsLogoutButtonStyle(
  isGuest: boolean,
  colors: {
    border: string;
    bgCard: string;
    text: string;
    primary: string;
    primaryLight: string;
    primaryDark: string;
  },
): LogoutButtonStyle {
  if (isGuest) {
    return {
      borderColor: `${colors.primary}55`,
      backgroundColor: colors.primaryLight,
      textColor: colors.primaryDark,
    };
  }
  return {
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    textColor: colors.text,
  };
}

/** Logout confirm is neutral — unlike account/data deletion. */
export function settingsLogoutConfirmAlertStyle(): 'default' {
  return 'default';
}
