/**
 * BriefPilotScanner native modülünü NativeStub kayıt sistemine bağlar.
 * iOS: OpenCV — Canny + findContours + warpPerspective + CLAHE + MagicFilter
 * Android: ileriki sprint
 */
import { NativeModules, Platform } from 'react-native';
import {
  registerNativeEdgeDetect,
  registerNativeWarp,
  registerNativeFilter,
} from '@/modules/scanner/engine/NativeStub';
import type { DocumentCorners } from '@/modules/scanner/types';

// FAZ 3: Kalite metadata — JS overlay ve status label için
export interface ScanQualityMeta {
  isBlurry:      boolean;
  needsFlash:    boolean;
  blurVariance:  number;
  avgBrightness: number;
}

// Singleton callback — CameraView veya useScanner kaydeder
let _qualityCallback: ((meta: ScanQualityMeta) => void) | null = null;
export function onScanQualityUpdate(cb: (meta: ScanQualityMeta) => void) {
  _qualityCallback = cb;
}

const RNScanner = NativeModules.BriefPilotScanner as {
  getCapabilities: () => Promise<Record<string, boolean | string>>;
  detectDocumentEdges: (payload: { uri: string }) => Promise<{
    topLeft?:      { x: number; y: number };
    topRight?:     { x: number; y: number };
    bottomRight?:  { x: number; y: number };
    bottomLeft?:   { x: number; y: number };
    confidence:    number;
    isBlurry:      boolean;
    needsFlash:    boolean;
    blurVariance:  number;
    avgBrightness: number;
    areaScore?:    number;
    angleScore?:   number;
    aspectScore?:  number;
    centerScore?:  number;
  } | null>;
  warpPerspective: (payload: {
    imageUri:    string;
    topLeft:     { x: number; y: number };
    topRight:    { x: number; y: number };
    bottomRight: { x: number; y: number };
    bottomLeft:  { x: number; y: number };
    outWidth?:   number;
    outHeight?:  number;
  }) => Promise<{ uri: string }>;
  applyFilter: (payload: {
    imageUri:   string;
    filter:     string;
    clipLimit?: number;
  }) => Promise<{ uri: string }>;
  applyMagicFilter: (payload: { imageUri: string }) => Promise<{ uri: string }>;
  detectEdgesInFrame: (payload: { uri: string }) => Promise<Record<string, unknown> | null>;
} | undefined;

let _initialized = false;

export async function initNativeScannerBridge(): Promise<void> {
  if (_initialized || !RNScanner) return;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  try {
    const caps = await RNScanner.getCapabilities();
    if (!caps.edgeDetection) return;

    registerNativeEdgeDetect(async (frame: { uri?: string }) => {
      if (!frame?.uri) return null;
      const result = await RNScanner!.detectDocumentEdges({ uri: frame.uri });
      if (!result) return null;

      // FAZ 3: quality metadata → callback
      _qualityCallback?.({
        isBlurry:      result.isBlurry,
        needsFlash:    result.needsFlash,
        blurVariance:  result.blurVariance,
        avgBrightness: result.avgBrightness,
      });

      if (!result.topLeft || result.confidence < 0.20) return null;

      return {
        topLeft:     result.topLeft!,
        topRight:    result.topRight!,
        bottomRight: result.bottomRight!,
        bottomLeft:  result.bottomLeft!,
        confidence:  result.confidence,
        areaScore:   result.areaScore,
        angleScore:  result.angleScore,
        aspectScore: result.aspectScore,
        centerScore: result.centerScore,
      } as DocumentCorners;
    });

    if (caps.perspectiveCorrection) {
      registerNativeWarp(async (imageUri: string, corners: DocumentCorners) => {
        const res = await RNScanner!.warpPerspective({
          imageUri,
          topLeft:     corners.topLeft,
          topRight:    corners.topRight,
          bottomRight: corners.bottomRight,
          bottomLeft:  corners.bottomLeft,
          outWidth:    2480,
          outHeight:   3508,
        });
        return res.uri;
      });
    }

    // FAZ 3.3: Magic filter öncelikli, fallback normal filter
    registerNativeFilter(async (imageUri: string, filterId: string) => {
      if (filterId === 'document' || filterId === 'bw' || filterId === 'magic') {
        const res = await RNScanner!.applyMagicFilter({ imageUri });
        return res.uri;
      }
      const res = await RNScanner!.applyFilter({ imageUri, filter: filterId });
      return res.uri;
    });

    _initialized = true;
    if (__DEV__) console.log('[NativeScannerBridge] OpenCV motor aktif (FAZ 1+2+3)');
  } catch (e) {
    if (__DEV__) console.warn('[NativeScannerBridge] init hata:', e);
  }
}

/** Warp sonrası magic filter uygula — direkt çağrı */
export async function applyMagicFilterToUri(uri: string): Promise<string> {
  if (!RNScanner) return uri;
  try {
    const res = await RNScanner.applyMagicFilter({ imageUri: uri });
    return res.uri;
  } catch {
    return uri;
  }
}
