import { Platform, NativeModules } from 'react-native';
import { OCR_MVP_BASE, EXPO_DETECTED_HOST } from '@/config';

let cachedBase: string | null = null;
let cachedHealthy: boolean = false;

function getMetroHost(): string | null {
  try {
    const scriptUrl: string | undefined = NativeModules.SourceCode?.scriptURL;
    if (!scriptUrl) return null;
    const match = scriptUrl.match(/https?:\/\/([\d.]+):/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function buildCandidates(): string[] {
  const deviceIp = process.env.EXPO_PUBLIC_DEVICE_IP?.trim();
  const metroHost = getMetroHost();
  const raw: (string | null | undefined)[] = [
    OCR_MVP_BASE,
    EXPO_DETECTED_HOST ? `http://${EXPO_DETECTED_HOST}:8000` : null,
    metroHost ? `http://${metroHost}:8000` : null,
    deviceIp ? `http://${deviceIp}:8000` : null,
    Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000',
  ];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of raw) {
    if (!c) continue;
    const t = c.trim();
    if (t && !seen.has(t)) { seen.add(t); result.push(t); }
  }
  return result;
}

async function ping(base: string, timeoutMs = 2000): Promise<boolean> {
  try {
    const res = await Promise.race([
      fetch(`${base}/health`),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    return (res as Response).ok;
  } catch {
    return false;
  }
}

export async function resolveOcrBackend(): Promise<{ base: string; healthy: boolean }> {
  if (!__DEV__) return { base: OCR_MVP_BASE, healthy: true };
  if (cachedBase !== null) return { base: cachedBase, healthy: cachedHealthy };

  const candidates = buildCandidates();
  for (const base of candidates) {
    if (await ping(base)) {
      cachedBase = base;
      cachedHealthy = true;
      console.info(`[OcrBackend] resolved → ${base}`);
      return { base, healthy: true };
    }
  }

  const fallback = candidates[0] ?? OCR_MVP_BASE;
  cachedBase = fallback;
  cachedHealthy = false;
  console.warn(`[OcrBackend] all candidates failed, fallback → ${fallback}`);
  return { base: fallback, healthy: false };
}

export function getCachedOcrBase(): string {
  return cachedBase ?? OCR_MVP_BASE;
}

export function resetOcrBackendCache(): void {
  cachedBase = null;
  cachedHealthy = false;
}
