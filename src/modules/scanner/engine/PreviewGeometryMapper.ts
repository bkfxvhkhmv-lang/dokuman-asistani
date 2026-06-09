import type { DocumentCorners } from '@/modules/scanner/types';

/**
 * Maps corners from native buffer space to preview display space,
 * and applies EMA smoothing for stable overlay rendering.
 *
 * Coordinate convention note:
 *   iOS AVCaptureVideoDataOutput delivers frames in landscape buffer orientation
 *   (bufferW > bufferH). However, the OpenCV detection in BriefPilotOpenCVHelper
 *   normalises corners against the portrait pixel axis — so the corners that arrive
 *   via onLiveScanResult are already in portrait-space (x across 1080px, y down 1920px).
 *   Callers must pass (captureW = native.height, captureH = native.width) to account
 *   for this landscape→portrait swap. The letterbox transform here then handles the
 *   remaining aspect-ratio difference between the buffer and the on-screen preview.
 */
export class PreviewGeometryMapper {
  private static readonly DEFAULT_ALPHA = 0.35;

  private viewWidth = 0;
  private viewHeight = 0;
  private smoothed: DocumentCorners | null = null;

  setViewDimensions(w: number, h: number) {
    this.viewWidth = w;
    this.viewHeight = h;
  }

  /**
   * Maps normalised corners from capture space to preview display space.
   * captureW / captureH describe the capture coordinate system after the
   * landscape→portrait swap has been applied by the caller.
   * Returns null when view dimensions are not yet known.
   */
  mapToDisplay(
    corners: DocumentCorners,
    captureW: number,
    captureH: number,
  ): DocumentCorners | null {
    if (this.viewWidth <= 0 || this.viewHeight <= 0) return null;

    const previewAspect = this.viewWidth / this.viewHeight;
    const captureAspect = captureW / captureH;

    const tr = (pt: { x: number; y: number }) => {
      if (captureAspect > previewAspect) {
        const pw = previewAspect / captureAspect;
        const xOff = (1 - pw) / 2;
        return { x: (pt.x - xOff) / pw, y: pt.y };
      }
      const ph = captureAspect / previewAspect;
      const yOff = (1 - ph) / 2;
      return { x: pt.x, y: (pt.y - yOff) / ph };
    };

    return {
      topLeft:     tr(corners.topLeft),
      topRight:    tr(corners.topRight),
      bottomRight: tr(corners.bottomRight),
      bottomLeft:  tr(corners.bottomLeft),
      confidence:  corners.confidence,
      areaScore:   corners.areaScore,
      angleScore:  corners.angleScore,
      aspectScore: corners.aspectScore,
      centerScore: corners.centerScore,
    };
  }

  smooth(raw: DocumentCorners, alpha = PreviewGeometryMapper.DEFAULT_ALPHA): DocumentCorners {
    if (!this.smoothed) {
      this.smoothed = raw;
      return raw;
    }

    const a = alpha;
    const b = 1 - a;
    const lp = (r: number, p: number) => a * r + b * p;
    const prev = this.smoothed;

    this.smoothed = {
      ...raw,
      topLeft:     { x: lp(raw.topLeft.x,     prev.topLeft.x),     y: lp(raw.topLeft.y,     prev.topLeft.y)     },
      topRight:    { x: lp(raw.topRight.x,    prev.topRight.x),    y: lp(raw.topRight.y,    prev.topRight.y)    },
      bottomRight: { x: lp(raw.bottomRight.x, prev.bottomRight.x), y: lp(raw.bottomRight.y, prev.bottomRight.y) },
      bottomLeft:  { x: lp(raw.bottomLeft.x,  prev.bottomLeft.x),  y: lp(raw.bottomLeft.y,  prev.bottomLeft.y)  },
    };

    return this.smoothed;
  }

  resetSmoothing() {
    this.smoothed = null;
  }

  get currentSmoothed(): DocumentCorners | null {
    return this.smoothed;
  }
}
