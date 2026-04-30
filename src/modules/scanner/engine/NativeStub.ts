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
// ── REAL NATIVE OPENCV INTEGRATION (FAZ 1) ──────────────────────────────────
import { NativeModules } from 'react-native';

const BriefPilotScanner = NativeModules.BriefPilotScanner;

async function realOpenCVEdgeDetect(frame: any): Promise<DocumentCorners | null> {
  // Eğer native modül henüz build edilmediyse (pod install yapılmadıysa) çökme, null döndür.
  if (!BriefPilotScanner || !frame?.uri) return null;

  try {
    // 1. Expo Camera'nın verdiği URI'yi Base64'e çevir
    const response = await fetch(frame.uri);
    const blob = await response.blob();
    
    const base64data = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // "data:image/jpeg;base64," kısmını kes at, sadece ham base64'i al
        resolve(reader.result?.toString().split(',')[1] || '');
      };
      reader.readAsDataURL(blob);
    });

    if (!base64data) return null;

    // 2. NATIVE MODÜLE GÖNDER (iOS veya Android)
    const result = await BriefPilotScanner.processFrame(base64data);

    // 3. Native'den gelen düz diziyi, DocumentCorners tipine çevir
    if (result && result.points && result.points.length === 4) {
      return {
        topLeft:     { x: result.points[0].x, y: result.points[0].y },
        topRight:    { x: result.points[1].x, y: result.points[1].y },
        bottomRight: { x: result.points[2].x, y: result.points[2].y },
        bottomLeft:  { x: result.points[3].x, y: result.points[3].y },
        confidence:  result.confidence
      };
    }

    // Native 4 köşe bulamadıysa null döndür (CameraEngine eski sahte kutuya geçecek)
    return null;

  } catch (error) {
    console.warn("[BriefPilot] Native OpenCV Hatası:", error);
    return null;
  }
}

// ── MOTORU ÇALIŞTIR ─────────────────────────────────────────────────────────
// Bu satır çalıştığında, NativeStub artık gerçek OpenCV'yi kullanacak!
registerNativeEdgeDetect(realOpenCVEdgeDetect);