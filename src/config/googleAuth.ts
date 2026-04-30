/**
 * Google OAuth istemci kimlikleri — platformlar ayrıdır (GCP'de farklı tür oluşturulur).
 *
 * iOS: Eksikse `Google.useAuthRequest` iOS'ta çökmez ama doğru istemci olmadan
 * OAuth hata dönebilir. Üretimde mutlaka "iOS" tipi OAuth istemci oluşturup
 * `app.json → extra.googleIosClientId` veya `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
 * ile verin (bundle: app.json içindeki `ios.bundleIdentifier` ile uyumlu).
 *
 * Expo dokümantasyonu: https://docs.expo.dev/guides/google-authentication/
 */
import Constants from 'expo-constants';

type ExtraKeys = {
  googleAndroidClientId?: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
};

function extra(): ExtraKeys {
  const e = Constants.expoConfig?.extra ?? (Constants.manifest as { extra?: ExtraKeys })?.extra ?? {};
  return typeof e === 'object' && e !== null ? (e as ExtraKeys) : {};
}

function env(key: string): string | undefined {
  try {
    return typeof process !== 'undefined' ? process.env[key] : undefined;
  } catch {
    return undefined;
  }
}

/** `app.json` extra'da boş string `""` bırakıldığında `??` ile varsayana düşebilsin */
function strOrUndef(s: string | undefined): string | undefined {
  const t = typeof s === 'string' ? s.trim() : '';
  return t.length > 0 ? t : undefined;
}

/** Android OAuth 2.0 client (paket imzası + SHA-1) */
export const GOOGLE_ANDROID_CLIENT_ID =
  strOrUndef(extra().googleAndroidClientId)
  ?? strOrUndef(env('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'))
  ?? '788836666259-5s3jv9qk0nhf23vbnrqal0cjm2eu6r98.apps.googleusercontent.com';

/** Web / sunucu token refresh — ve geçişte iOS yedek client */
export const GOOGLE_WEB_CLIENT_ID =
  strOrUndef(extra().googleWebClientId)
  ?? strOrUndef(env('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'))
  ?? '788836666259-vp0eqcpbped3q86as7bpdheq2f24u4cc.apps.googleusercontent.com';

export const GOOGLE_IOS_CLIENT_ID_RAW =
  strOrUndef(extra().googleIosClientId)
  ?? strOrUndef(env('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'))
  ?? '';

/**
 * Google `useAuthRequest` için iOS `iosClientId` alanı — zorunlu.
 *
 * GCP'de iOS OAuth client yoksa: birçok geliştirme senaryosunda Web client ile
 * dene işe yarayabilir; üretimde `GOOGLE_IOS_CLIENT_ID_RAW`'ı gerçek iOS kimliği
 * ile doldurmanız beklenir.
 */
export const GOOGLE_IOS_CLIENT_ID =
  GOOGLE_IOS_CLIENT_ID_RAW.length > 0 ? GOOGLE_IOS_CLIENT_ID_RAW : GOOGLE_WEB_CLIENT_ID;
