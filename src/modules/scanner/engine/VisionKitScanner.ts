import { NativeModules, Platform } from 'react-native';

export interface VisionScanResult {
  imageUris: string[];
  pageCount: number;
  corrected: boolean;
  cancelled?: boolean;
  source: 'visionkit' | 'mlkit' | 'fallback';
}

const RN = NativeModules.BriefPilotVisionScanner;

export const visionKitAvailable: boolean = (Platform.OS === 'ios' || Platform.OS === 'android') && !!RN;

/**
 * Opens Apple VisionKit document scanner (iOS only).
 * Returns scanned page URIs with perspective correction already applied by iOS.
 * Falls back gracefully when unavailable (Android, Expo Go, old iOS).
 */
export async function scanWithVisionKit(): Promise<VisionScanResult> {
  if (!visionKitAvailable) {
    return { imageUris: [], pageCount: 0, corrected: false, cancelled: true, source: 'fallback' };
  }
  try {
    const result = await RN.scanDocuments();
    return result as VisionScanResult;
  } catch (e: any) {
    if (__DEV__) console.log('[VisionKit] error:', e?.message ?? e);
    throw e;
  }
}
