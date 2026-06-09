import { Skia } from '@shopify/react-native-skia';

import { MEAN_DIM, PAPER_DIM } from './constants';

/** En parlak bantların ortalaması — kağıt rengine yaklaşır, mürekkep bozar */
export function computePaperLuminance(illumImg: any, w: number, h: number): number {
  try {
    const surface = Skia.Surface.MakeOffscreen(PAPER_DIM, PAPER_DIM) ?? Skia.Surface.Make(PAPER_DIM, PAPER_DIM);
    if (!surface) return 0.5;
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    surface.getCanvas().drawImageRect(
      illumImg,
      { x: 0, y: 0, width: w, height: h },
      { x: 0, y: 0, width: PAPER_DIM, height: PAPER_DIM },
      paint,
    );
    surface.flush();
    const snap = surface.makeImageSnapshot();
    const pixels = snap.readPixels?.();
    if (!pixels || pixels.length < 4) return 0.5;

    const lums: number[] = [];
    for (let i = 0; i + 2 < pixels.length; i += 4) {
      const lum = (0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]) / 255;
      if (Number.isFinite(lum)) lums.push(lum);
    }
    if (lums.length === 0) return 0.5;

    lums.sort((a, b) => a - b);
    const startIdx = Math.floor(lums.length * 0.66);
    const paperBand = lums.slice(startIdx);
    const paperMean = paperBand.reduce((s, v) => s + v, 0) / paperBand.length;

    if (paperMean < 0.4) {
      const overall = lums.reduce((s, v) => s + v, 0) / lums.length;
      return Math.min(1.0, Math.max(0.05, overall));
    }
    return Math.min(1.0, Math.max(0.05, paperMean));
  } catch {
    return 0.5;
  }
}

/** Basit küçük yüzey ortalaması (yedek ortalama) */
export function computeGlobalMean(illumImg: any, w: number, h: number): number {
  try {
    const surface = Skia.Surface.MakeOffscreen(MEAN_DIM, MEAN_DIM) ?? Skia.Surface.Make(MEAN_DIM, MEAN_DIM);
    if (!surface) return 0.5;
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    surface.getCanvas().drawImageRect(
      illumImg,
      { x: 0, y: 0, width: w, height: h },
      { x: 0, y: 0, width: MEAN_DIM, height: MEAN_DIM },
      paint,
    );
    surface.flush();
    const snap = surface.makeImageSnapshot();
    const pixels = snap.readPixels?.();
    if (!pixels || pixels.length < 4) return 0.5;
    let total = 0;
    let count = 0;
    for (let i = 0; i + 2 < pixels.length; i += 4) {
      total += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      count += 1;
    }
    if (count === 0) return 0.5;
    const mean = total / count / 255;
    if (!Number.isFinite(mean) || mean <= 0) return 0.5;
    return Math.min(1.0, Math.max(0.05, mean));
  } catch {
    return 0.5;
  }
}
