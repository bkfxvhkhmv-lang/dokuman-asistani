import Constants from 'expo-constants';
import { Platform } from 'react-native';

interface EnvConfig {
  API_BASE: string;
  OCR_MVP_BASE: string;
}

type ConfigSource = 'extra' | 'env' | 'fallback' | 'auto-detect' | 'none';
const LOOPBACK_HOST = '127.0.0.1';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  APP_ENV?: string;
  API_BASE?: string;
  OCR_MVP_BASE?: string;
  EXPO_PUBLIC_DEVICE_IP?: string;
};

const extraApiBase = typeof extra.API_BASE === 'string' ? extra.API_BASE.trim() : '';
const extraOcrBase = typeof extra.OCR_MVP_BASE === 'string' ? extra.OCR_MVP_BASE.trim() : '';
const extraDeviceIp = typeof extra.EXPO_PUBLIC_DEVICE_IP === 'string'
  ? extra.EXPO_PUBLIC_DEVICE_IP.trim()
  : '';

const PROD_API_BASE = extraApiBase || process.env.API_BASE?.trim() || 'https://api.briefpilot.de/api/v4';
const PROD_OCR_MVP_BASE = extraOcrBase || process.env.OCR_MVP_BASE?.trim() || 'https://api.briefpilot.app';

const appEnv = extra.APP_ENV ?? 'development';

function stripScheme(hostUri: string): string {
  return hostUri.replace(/^https?:\/\//, '').split('/')[0] ?? '';
}

function extractHost(candidate: string | undefined | null): string | null {
  if (!candidate) return null;
  const cleaned = stripScheme(candidate).trim();
  if (!cleaned) return null;
  const host = cleaned.split(':')[0]?.trim();
  return host || null;
}

function getSourceTag(extraValue: string, envValue: string): Exclude<ConfigSource, 'auto-detect' | 'none'> {
  if (extraValue) return 'extra';
  if (envValue) return 'env';
  return 'fallback';
}

function normalizeDeviceIp(candidate: string | undefined): string {
  if (!candidate) return '';
  const trimmed = candidate.trim();
  if (!trimmed) return '';
  return trimmed === 'localhost' ? LOOPBACK_HOST : trimmed;
}

function detectExpoHost(): string | null {
  const legacyManifest = (Constants as typeof Constants & { manifest?: { debuggerHost?: string } }).manifest;
  const manifest2 = (Constants as typeof Constants & {
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
  }).manifest2;
  const expoGoConfig = (Constants as typeof Constants & {
    expoGoConfig?: { debuggerHost?: string; hostUri?: string };
  }).expoGoConfig;

  const candidates = [
    Constants.expoConfig?.hostUri,
    manifest2?.extra?.expoClient?.hostUri,
    legacyManifest?.debuggerHost,
    expoGoConfig?.debuggerHost,
    expoGoConfig?.hostUri,
  ];

  for (const candidate of candidates) {
    const host = extractHost(candidate);
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  }
  return null;
}

function resolveDevConfig(): EnvConfig {
  const explicitOcrBase =
    extraOcrBase
    || process.env.EXPO_PUBLIC_OCR_BASE?.trim()
    || process.env.OCR_MVP_BASE?.trim()
    || '';
  const explicitApiBase = extraApiBase || process.env.API_BASE?.trim() || '';
  const useDeviceIpOverride = process.env.EXPO_PUBLIC_USE_DEVICE_IP?.trim() === 'true';
  const deviceIp = normalizeDeviceIp(extraDeviceIp || process.env.EXPO_PUBLIC_DEVICE_IP?.trim());

  // 1) Explicit OCR base override wins when intentionally provided.
  if (explicitOcrBase) {
    const apiBaseFromOcr = explicitApiBase || `${explicitOcrBase.replace(/\/+$/, '')}/api/v4`;
    console.info(`[Config] explicit OCR base kullanılıyor: ${explicitOcrBase}`);
    return {
      API_BASE: apiBaseFromOcr,
      OCR_MVP_BASE: explicitOcrBase,
    };
  }

  // 2) Expo host auto-detection is the normal dev default for physical devices.
  const host = detectExpoHost();
  if (host) {
    console.info(`[Config] Expo host auto-detect kullanılıyor: ${host}`);
    return {
      API_BASE: `http://${host}:8000/api/v4`,
      OCR_MVP_BASE: `http://${host}:8000`,
    };
  }

  // 3) Manual device IP remains available as explicit override/fallback, including
  // 127.0.0.1 for physical-device smoke via adb reverse.
  if (deviceIp) {
    console.info(
      useDeviceIpOverride
        ? `[Config] EXPO_PUBLIC_USE_DEVICE_IP=true, device IP override kullanılıyor: ${deviceIp}`
        : `[Config] Auto-detect yok, EXPO_PUBLIC_DEVICE_IP fallback kullanılıyor: ${deviceIp}`,
    );
    return {
      API_BASE: `http://${deviceIp}:8000/api/v4`,
      OCR_MVP_BASE: `http://${deviceIp}:8000`,
    };
  }

  // 4) Final fallback: 127.0.0.1 works for both physical device and emulator via
  // `adb reverse tcp:8000 tcp:8000`. For emulator without adb reverse, set
  // OCR_MVP_BASE explicitly so this branch is never reached.
  return {
    API_BASE: explicitApiBase || `http://${LOOPBACK_HOST}:8000/api/v4`,
    OCR_MVP_BASE: `http://${LOOPBACK_HOST}:8000`,
  };
}

const cfg: EnvConfig = appEnv === 'beta' || appEnv === 'production'
  ? {
      API_BASE: PROD_API_BASE,
      OCR_MVP_BASE: PROD_OCR_MVP_BASE,
    }
  : resolveDevConfig();

if (__DEV__) {
  console.info('[Config] API_BASE', cfg.API_BASE);
}

const apiSource: ConfigSource = appEnv === 'beta' || appEnv === 'production'
  ? getSourceTag(extraApiBase, process.env.API_BASE?.trim() || '')
  : extraApiBase
    ? 'extra'
    : process.env.API_BASE?.trim()
      ? 'env'
      : detectExpoHost()
        ? 'auto-detect'
        : (extraDeviceIp || process.env.EXPO_PUBLIC_DEVICE_IP?.trim())
          ? ((normalizeDeviceIp(extraDeviceIp) ? 'extra'
            : process.env.EXPO_PUBLIC_DEVICE_IP?.trim()
              ? 'env'
              : 'fallback'))
          : 'fallback';

const ocrSource: ConfigSource = appEnv === 'beta' || appEnv === 'production'
  ? getSourceTag(extraOcrBase, process.env.OCR_MVP_BASE?.trim() || '')
  : extraOcrBase
    ? 'extra'
    : (process.env.EXPO_PUBLIC_OCR_BASE?.trim() || process.env.OCR_MVP_BASE?.trim())
      ? 'env'
      : detectExpoHost()
        ? 'auto-detect'
        : (extraDeviceIp || process.env.EXPO_PUBLIC_DEVICE_IP?.trim())
          ? ((normalizeDeviceIp(extraDeviceIp) ? 'extra'
            : process.env.EXPO_PUBLIC_DEVICE_IP?.trim()
              ? 'env'
              : 'fallback'))
          : 'fallback';

const deviceIpSource: ConfigSource = extraDeviceIp
  ? 'extra'
  : process.env.EXPO_PUBLIC_DEVICE_IP?.trim()
    ? 'env'
    : detectExpoHost()
      ? 'auto-detect'
      : 'none';

console.info(
  '[ConfigGate]',
  {
    appEnv,
    apiSource,
    ocrSource,
    deviceIpSource,
    apiHost: extractHost(cfg.API_BASE),
    ocrHost: extractHost(cfg.OCR_MVP_BASE),
    deviceIp: normalizeDeviceIp(extraDeviceIp || process.env.EXPO_PUBLIC_DEVICE_IP?.trim()) || null,
  },
);

export const API_BASE: string = cfg.API_BASE;
export const OCR_MVP_BASE: string = cfg.OCR_MVP_BASE;
export const EXPO_DETECTED_HOST: string | null = __DEV__ ? detectExpoHost() : null;
