import type { DocumentCorners } from '../types';

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
