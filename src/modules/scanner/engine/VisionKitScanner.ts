import { NativeModules, Platform } from 'react-native';

export interface VisionScanResult {
  imageUris: string[];
  pageCount: number;
  corrected: boolean;
  cancelled?: boolean;
  source: 'visionkit' | 'mlkit' | 'fallback';
}

const RN = NativeModules.BriefPilotVisionScanner;

// iOS: VisionKit (BriefPilotVisionScanner native module)
// Android: ML Kit Document Scanner (same module name, same scanDocuments() API)
// Expo Go: module not linked → falls back to plain camera
export const visionKitAvailable: boolean = !!RN;

if (__DEV__) {
  if (Platform.OS === 'android') {
    console.log('[Scanner] android native document scanner ' + (RN ? 'available' : 'unavailable, falling back'));
  }
}

export async function scanWithVisionKit(): Promise<VisionScanResult> {
  if (!visionKitAvailable) {
    return { imageUris: [], pageCount: 0, corrected: false, cancelled: true, source: 'fallback' };
  }
  try {
    if (__DEV__ && Platform.OS === 'android') {
      console.log('[Scanner] android native document scanner used');
    }
    const result = await RN.scanDocuments();
    return result as VisionScanResult;
  } catch (e: any) {
    if (__DEV__) {
      if (Platform.OS === 'android') {
        console.log('[Scanner] android native document scanner unavailable, falling back');
      } else {
        console.log('[VisionKit] error:', e?.message ?? e);
      }
    }
    throw e;
  }
}
