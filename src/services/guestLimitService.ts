import AsyncStorage from '@react-native-async-storage/async-storage';

export const GUEST_DOC_LIMIT = 3;
export const GUEST_OCR_LIMIT = 3;

const DOC_COUNT_KEY = '@briefpilot_guest_doc_count';
const OCR_COUNT_KEY = '@briefpilot_guest_ocr_count';

export interface GuestLimitCounts {
  docCount: number;
  ocrCount: number;
  docMax: number;
  ocrMax: number;
}

async function readCount(key: string): Promise<number> {
  const raw = await AsyncStorage.getItem(key);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function writeCount(key: string, value: number): Promise<void> {
  await AsyncStorage.setItem(key, String(Math.max(0, value)));
}

export async function getCounts(): Promise<GuestLimitCounts> {
  const [docCount, ocrCount] = await Promise.all([
    readCount(DOC_COUNT_KEY),
    readCount(OCR_COUNT_KEY),
  ]);
  return {
    docCount,
    ocrCount,
    docMax: GUEST_DOC_LIMIT,
    ocrMax: GUEST_OCR_LIMIT,
  };
}

export async function canAddDocument(): Promise<boolean> {
  const docCount = await readCount(DOC_COUNT_KEY);
  return docCount < GUEST_DOC_LIMIT;
}

export async function recordDocument(): Promise<void> {
  const docCount = await readCount(DOC_COUNT_KEY);
  await writeCount(DOC_COUNT_KEY, docCount + 1);
}

export async function canRunOcr(): Promise<boolean> {
  const ocrCount = await readCount(OCR_COUNT_KEY);
  return ocrCount < GUEST_OCR_LIMIT;
}

export async function recordOcr(): Promise<void> {
  const ocrCount = await readCount(OCR_COUNT_KEY);
  await writeCount(OCR_COUNT_KEY, ocrCount + 1);
}

export async function clearLimits(): Promise<void> {
  await AsyncStorage.multiRemove([DOC_COUNT_KEY, OCR_COUNT_KEY]);
}
