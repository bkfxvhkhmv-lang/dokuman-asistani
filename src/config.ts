import Constants from 'expo-constants';
import { Platform } from 'react-native';

interface EnvConfig {
  API_BASE: string;
  OCR_MVP_BASE: string;
}

const PROD_API_BASE = process.env.API_BASE?.trim() || 'https://api.briefpilot.de/api/v4';
const PROD_OCR_MVP_BASE = process.env.OCR_MVP_BASE?.trim() || 'https://api.briefpilot.app';

const appEnv = (Constants.expoConfig?.extra?.APP_ENV as string | undefined) ?? 'development';

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
  // === EN YÜKSEK ÖNCELİK: .env.local'daki EXPO_PUBLIC_DEVICE_IP ===
  const deviceIp = process.env.EXPO_PUBLIC_DEVICE_IP?.trim();
  if (deviceIp && deviceIp !== '127.0.0.1' && deviceIp !== 'localhost') {
    console.info(`[Config] EXPO_PUBLIC_DEVICE_IP kullanılıyor: ${deviceIp}`);
    return {
      API_BASE: `http://${deviceIp}:8000/api/v4`,
      OCR_MVP_BASE: `http://${deviceIp}:8000`,
    };
  }

  const explicitApiBase = process.env.API_BASE?.trim() || '';
  const explicitOcrBase = process.env.OCR_MVP_BASE?.trim() || '';
  const host = detectExpoHost();

  if (host) {
    return {
      API_BASE: `http://${host}:8000/api/v4`,
      OCR_MVP_BASE: `http://${host}:8000`,
    };
  }

  if (explicitApiBase) {
    const origin = (() => {
      try { return new URL(explicitApiBase).origin; } catch { return ''; }
    })();
    return {
      API_BASE: explicitApiBase,
      OCR_MVP_BASE: explicitOcrBase || origin,
    };
  }

  const isAndroidEmulator = Platform.OS === 'android';
  const simulatorHost = isAndroidEmulator ? '10.0.2.2' : '127.0.0.1';
  return {
    API_BASE: `http://${simulatorHost}:8000/api/v4`,
    OCR_MVP_BASE: `http://${simulatorHost}:8000`,
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

export const API_BASE: string = cfg.API_BASE;
export const OCR_MVP_BASE: string = cfg.OCR_MVP_BASE;
