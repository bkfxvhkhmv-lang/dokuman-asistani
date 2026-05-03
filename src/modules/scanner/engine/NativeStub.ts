import type { DocumentCorners } from '@/modules/scanner/types';

// ── Native module registration ────────────────────────────────────────────────
// Real native implementations (OpenCV, CoreImage, MLKit) register here.
// Until linked, the JS fallbacks below are used transparently.

type EdgeDetectFn    = (frame: any) => Promise<DocumentCorners | null>;
type WarpFn          = (imageUri: string, corners: DocumentCorners) => Promise<string>;
type FilterApplyFn   = (imageUri: string, filterId: string) => Promise<string>;

interface NativeRegistry {
  detectEdges:  EdgeDetectFn | null;
  warpPerspective: WarpFn | null;
  applyFilter:  FilterApplyFn | null;
}

const _native: NativeRegistry = {
  detectEdges:     null,
  warpPerspective: null,
  applyFilter:     null,
};

/** Call from a native module's init code to register real implementations. */
export function registerNativeEdgeDetect(fn: EdgeDetectFn)    { _native.detectEdges = fn; }
export function registerNativeWarp(fn: WarpFn)                { _native.warpPerspective = fn; }
export function registerNativeFilter(fn: FilterApplyFn)       { _native.applyFilter = fn; }

// ── Public API ────────────────────────────────────────────────────────────────

export async function nativeDetectDocumentEdges(frame: any): Promise<DocumentCorners | null> {
  if (_native.detectEdges) {
    try { return await _native.detectEdges(frame); } catch { /* fall through */ }
  }
  return null;
}

export async function nativeWarpPerspective(
  imageUri: string,
  corners: DocumentCorners,
): Promise<string> {
  if (_native.warpPerspective) {
    try { return await _native.warpPerspective(imageUri, corners); } catch { /* fall through */ }
  }
  return imageUri;
}

export async function nativeApplyFilter(
  imageUri: string,
  filterId: string,
): Promise<string> {
  if (_native.applyFilter) {
    try { return await _native.applyFilter(imageUri, filterId); } catch { /* fall through */ }
  }
  // JS fallback: re-encode at target quality without any transformation
  const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
  return (await manipulateAsync(imageUri, [], { compress: 0.92, format: SaveFormat.JPEG })).uri;
}

/** True if at least one real native implementation is registered. */
export function hasNativeMotor(): boolean {
  return !!(
    _native.detectEdges ||
    _native.warpPerspective ||
    _native.applyFilter
  );
}
// ── REAL NATIVE OPENCV INTEGRATION ──────────────────────────────────────────
import { NativeModules } from 'react-native';

const RN = NativeModules.BriefPilotScanner;

/** True when the native OpenCV module is linked (dev-client / Xcode build). False in Expo Go. */
export const nativeModuleAvailable: boolean = !!RN;

if (__DEV__) {
  console.log('[ScannerNative] runtime=' + (RN ? 'native-build' : 'expo-go'));
  console.log('[ScannerNative] moduleAvailable=' + nativeModuleAvailable);
}

async function realOpenCVEdgeDetect(frame: any): Promise<DocumentCorners | null> {
  if (!RN?.detectDocumentEdges || !frame?.uri) return null;
  try {
    const result = await RN.detectDocumentEdges({ uri: frame.uri });
    if (!result || result.confidence < 0.2) {
      if (__DEV__) console.log('[ScannerNative] fromNative=false confidence=' + (result?.confidence ?? 0).toFixed(3));
      return null;
    }
    const corners: DocumentCorners = {
      topLeft:     { x: result.topLeft.x,     y: result.topLeft.y },
      topRight:    { x: result.topRight.x,    y: result.topRight.y },
      bottomRight: { x: result.bottomRight.x, y: result.bottomRight.y },
      bottomLeft:  { x: result.bottomLeft.x,  y: result.bottomLeft.y },
      confidence:  result.confidence,
    };
    if (__DEV__) {
      console.log('[ScannerNative] fromNative=true confidence=' + result.confidence.toFixed(3));
      console.log('[ScannerNative] areaScore=' + (result.areaScore ?? 0).toFixed(3)
        + ' angleScore=' + (result.angleScore ?? 0).toFixed(3)
        + ' aspectScore=' + (result.aspectScore ?? 0).toFixed(3)
        + ' centerScore=' + (result.centerScore ?? 0).toFixed(3));
    }
    return corners;
  } catch {
    return null;
  }
}

async function realOpenCVWarp(imageUri: string, corners: DocumentCorners): Promise<string> {
  if (!RN?.warpPerspective) return imageUri;
  try {
    const result = await RN.warpPerspective({
      imageUri,
      topLeft:     corners.topLeft,
      topRight:    corners.topRight,
      bottomRight: corners.bottomRight,
      bottomLeft:  corners.bottomLeft,
      outWidth:    2480,
      outHeight:   3508,
    });
    return result?.uri ?? imageUri;
  } catch {
    return imageUri;
  }
}

async function realOpenCVFilter(imageUri: string, filterId: string): Promise<string> {
  if (!RN) return imageUri;
  try {
    // document/bw/magic/thresh → full magic filter (CLAHE + adaptive threshold + morph cleanup)
    if (filterId === 'document' || filterId === 'bw' || filterId === 'magic' || filterId === 'thresh') {
      const result = await RN.applyMagicFilter({ imageUri });
      return result?.uri ?? imageUri;
    }
    // shadow → dedicated shadow removal
    if (filterId === 'shadow') {
      const result = await RN.applyFilter({ imageUri, filter: 'shadow' });
      return result?.uri ?? imageUri;
    }
    // clean/enhance/clahe/contrast → CLAHE (local contrast boost, keeps colour)
    const result = await RN.applyFilter({
      imageUri,
      filter: 'clahe',
      clipLimit: filterId === 'contrast' ? 3.5 : 2.0,
    });
    return result?.uri ?? imageUri;
  } catch {
    return imageUri;
  }
}

if (RN) {
  registerNativeEdgeDetect(realOpenCVEdgeDetect);
  registerNativeWarp(realOpenCVWarp);
  registerNativeFilter(realOpenCVFilter);
}