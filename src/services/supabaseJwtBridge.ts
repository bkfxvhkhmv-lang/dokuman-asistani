import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

/** SecureStore anahtarı — BriefPilot JWT’inden ayrı tutulur. */
const SUPABASE_JWT_KEY = 'bp_supabase_jwt';

/**
 * Backend V2+ Supabase doğrulaması ile uyumlu: aynı `Authorization` hattından
 * `authFetch` kullanılacaksa önce `bp_access_token`, yoksa bu JWT seçilir (`getEffectiveAccessToken`).
 *
 * Projede anon URL: `extra.supabaseUrl` (app.json) veya gelecek EXPO_PUBLIC değişkenleri.
 */
export function getSupabaseUrlFromExtras(): string | undefined {
  const ex = Constants.expoConfig?.extra as { supabaseUrl?: string } | undefined;
  const u = typeof ex?.supabaseUrl === 'string' ? ex.supabaseUrl.trim() : '';
  return u.length > 0 ? u : undefined;
}

export async function setSupabaseAccessToken(jwt: string | null | undefined): Promise<void> {
  if (!jwt?.trim()) return;
  await SecureStore.setItemAsync(SUPABASE_JWT_KEY, jwt.trim());
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SUPABASE_JWT_KEY);
}

export async function clearSupabaseAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(SUPABASE_JWT_KEY).catch(() => {});
}
