import AsyncStorage from '@react-native-async-storage/async-storage';

/** Dil + Aktivierung tamamlanınca (index yönlendirmesi); First-Value veya Login ile set edilir */
export const ONBOARDING_DONE_KEY = '@briefpilot_onboarding_done';

/** İlk onboarding taramasında kayıttan sonra First-Value ekranına düşülür */
export const PENDING_FIRST_VALUE_NAV_KEY = '@briefpilot_pending_first_value_nav';

/** `true`: useSmartNotifications mount’ta sistem izni isteme (soft ask First-Value sonrası) */
export const BLOCK_AUTO_NOTIFICATION_REQUEST_KEY = '@briefpilot_block_auto_notif';

export async function setPendingFirstValueNavigation(): Promise<void> {
  await AsyncStorage.setItem(PENDING_FIRST_VALUE_NAV_KEY, 'true');
}

/** Tüket: bir kez okunur — true dönerse first-value’a git */
export async function consumePendingFirstValueNavigation(): Promise<boolean> {
  const v = await AsyncStorage.getItem(PENDING_FIRST_VALUE_NAV_KEY);
  if (v !== 'true') return false;
  await AsyncStorage.removeItem(PENDING_FIRST_VALUE_NAV_KEY);
  return true;
}

export async function peekPendingFirstValueNavigation(): Promise<boolean> {
  return (await AsyncStorage.getItem(PENDING_FIRST_VALUE_NAV_KEY)) === 'true';
}

/** Abgebrochene Onboarding‑Kamera ohne Beleg — Flag zurücksetzen */
export async function clearPendingFirstValueNavigation(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_FIRST_VALUE_NAV_KEY);
}

export async function setAutoNotificationBlocked(block: boolean): Promise<void> {
  if (block) await AsyncStorage.setItem(BLOCK_AUTO_NOTIFICATION_REQUEST_KEY, 'true');
  else await AsyncStorage.removeItem(BLOCK_AUTO_NOTIFICATION_REQUEST_KEY);
}

export async function isAutoNotificationBlocked(): Promise<boolean> {
  return (await AsyncStorage.getItem(BLOCK_AUTO_NOTIFICATION_REQUEST_KEY)) === 'true';
}
