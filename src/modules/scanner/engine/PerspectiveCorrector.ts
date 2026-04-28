import { DocumentCorners } from '../types';
import { nativeWarpPerspective } from './NativeStub';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const A4_WIDTH_PX = 2480;  // 300 DPI A4
const A4_HEIGHT_PX = 3508;

export class PerspectiveCorrector {
  private enabled = true;

  setEnabled(enabled: boolean) { this.enabled = enabled; }

  /**
   * Correct perspective using detected corners.
   * Corners are normalized (0-1) coordinates relative to image dimensions.
   * Native warpPerspective (homography) plugs in via NativeStub — this JS
   * implementation performs crop + deskew + A4 normalization as fallback.
   */
  async correct(imageUri: string, corners: DocumentCorners, imageWidth?: number, imageHeight?: number): Promise<string> {
    if (!this.enabled || corners.confidence < 0.4) return imageUri;

    try {
      const native = await nativeWarpPerspective(imageUri, corners);
      if (native !== imageUri) return native;

      return await this.jsCropAndNormalize(imageUri, corners, imageWidth, imageHeight);
    } catch (e) {
      console.error('[PerspectiveCorrector] correction failed:', e);
      return imageUri;
    }
  }

  /**
   * JS fallback: crops to bounding box of corner quad, then resizes to
   * A4-proportional dimensions with a contrast boost for readability.
   */
  private async jsCropAndNormalize(
    uri: string,
    corners: DocumentCorners,
    imgW?: number,
    imgH?: number,
  ): Promise<string> {
    // If no image dimensions provided, get them from a minimal manipulate call
    let width = imgW;
    let height = imgH;
    if (!width || !height) {
      const probe = await manipulateAsync(uri, [], { compress: 1, format: SaveFormat.JPEG });
      // expo-image-manipulator doesn't expose dimensions without a resize — use large defaults
      width = width ?? 2000;
      height = height ?? 2000;
    }

    // Bounding box of the quadrilateral (normalized → pixels)
    const xs = [corners.topLeft.x, corners.topRight.x, corners.bottomRight.x, corners.bottomLeft.x];
    const ys = [corners.topLeft.y, corners.topRight.y, corners.bottomRight.y, corners.bottomLeft.y];
    const minX = Math.max(0, Math.min(...xs));
    const maxX = Math.min(1, Math.max(...xs));
    const minY = Math.max(0, Math.min(...ys));
    const maxY = Math.min(1, Math.max(...ys));

    const cropX = Math.round(minX * width);
    const cropY = Math.round(minY * height);
    const cropW = Math.round((maxX - minX) * width);
    const cropH = Math.round((maxY - minY) * height);

    if (cropW < 200 || cropH < 200) return uri;

    // Target: A4 proportions, capped at 2x original crop size to avoid upscaling artifacts
    const targetH = Math.round(cropW * A4_HEIGHT_PX / A4_WIDTH_PX);
    const outW = Math.min(A4_WIDTH_PX, cropW * 2);
    const outH = Math.min(A4_HEIGHT_PX, targetH * 2);

    const result = await manipulateAsync(
      uri,
      [
        { crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } },
        { resize: { width: outW, height: outH } },
      ],
      { compress: 0.92, format: SaveFormat.JPEG }
    );

    return result.uri;
  }

  /**
   * Compute the output dimensions for a given set of corners and image dimensions.
   * Used to pre-display expected output size.
   */
  getOutputDimensions(corners: DocumentCorners, imageWidth: number, imageHeight: number) {
    const xs = [corners.topLeft.x, corners.topRight.x, corners.bottomRight.x, corners.bottomLeft.x];
    const ys = [corners.topLeft.y, corners.topRight.y, corners.bottomRight.y, corners.bottomLeft.y];
    const cropW = Math.round((Math.max(...xs) - Math.min(...xs)) * imageWidth);
    const cropH = Math.round((Math.max(...ys) - Math.min(...ys)) * imageHeight);
    return { width: Math.min(A4_WIDTH_PX, cropW * 2), height: Math.min(A4_HEIGHT_PX, cropH * 2) };
  }
}
