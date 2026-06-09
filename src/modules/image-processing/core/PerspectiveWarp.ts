/**
 * PerspectiveWarp — Skia-based perspective correction.
 *
 * Verilen 4 köşe noktasından homografi matrisi hesaplar ve
 * Skia offscreen surface üzerinde perspektif düzeltmesi uygular.
 *
 * Algoritma: 4-nokta homografi (DLT) → 3×3 H matrisi → H⁻¹ ile ters örnekleme.
 */
import { Skia, TileMode, FilterMode, MipmapMode, ImageFormat } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';

export type Point2D = { x: number; y: number };
export type Quad = [Point2D, Point2D, Point2D, Point2D]; // TL, TR, BR, BL

// ---------------------------------------------------------------------------
// Gaussian elimination for Ax = b  (8×8 system)
// ---------------------------------------------------------------------------
function gaussElim(A: number[][], b: number[]): number[] {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-10) throw new Error('Singular matrix — degenerate corners');

    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / pivot;
      for (let k = col; k <= n; k++) M[row][k] -= factor * M[col][k];
    }
  }

  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    x[row] = M[row][n];
    for (let col = row + 1; col < n; col++) x[row] -= M[row][col] * x[col];
    x[row] /= M[row][row];
  }
  return x;
}

// ---------------------------------------------------------------------------
// Direct Linear Transform: compute 3×3 homography H
// src[i] → dst[i]  for i=0..3
// Returns flat row-major 9-element array: [h0..h8] where H[3x3][row][col]
// ---------------------------------------------------------------------------
export function computeHomography(src: Quad, dst: Quad): Float32Array {
  const rows: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: X, y: Y } = dst[i];
    rows.push([x, y, 1, 0, 0, 0, -X * x, -X * y]);
    b.push(X);
    rows.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]);
    b.push(Y);
  }

  const h = gaussElim(rows, b); // [h0..h7]
  return new Float32Array([h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1.0]);
}

// ---------------------------------------------------------------------------
// 3×3 matrix inverse (analytical via adjugate / determinant)
// ---------------------------------------------------------------------------
function invertMatrix3(H: Float32Array): Float32Array {
  const [a, b, c, d, e, f, g, hh, i] = Array.from(H);
  const det = a * (e * i - f * hh) - b * (d * i - f * g) + c * (d * hh - e * g);
  if (Math.abs(det) < 1e-10) throw new Error('Non-invertible homography');
  const inv = 1 / det;
  return new Float32Array([
     (e * i - f * hh) * inv, -(b * i - c * hh) * inv,  (b * f - c * e) * inv,
    -(d * i - f * g)  * inv,  (a * i - c * g)  * inv, -(a * f - c * d) * inv,
     (d * hh - e * g) * inv, -(a * hh - b * g) * inv,  (a * e - b * d) * inv,
  ]);
}

// ---------------------------------------------------------------------------
// Target output size — A4 proportions, capped at 2480px height
// ---------------------------------------------------------------------------
export function computeOutputSize(corners: Quad): { width: number; height: number } {
  const [tl, tr, br, bl] = corners;
  const topW  = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const botW  = Math.hypot(br.x - bl.x, br.y - bl.y);
  const leftH = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rigH  = Math.hypot(br.x - tr.x, br.y - tr.y);
  const w = Math.round(Math.max(topW, botW));
  const h = Math.round(Math.max(leftH, rigH));
  const maxH = 2480;
  if (h > maxH) {
    const s = maxH / h;
    return { width: Math.round(w * s), height: maxH };
  }
  return { width: w, height: h };
}

// ---------------------------------------------------------------------------
// Main warp function
// srcCorners: pixel coordinates in the source image (TL, TR, BR, BL)
// outputW / outputH: output image dimensions (or pass 0,0 to auto-compute)
// Returns: file URI of the perspective-corrected image
// ---------------------------------------------------------------------------
export async function warpPerspective(
  uri: string,
  srcCorners: Quad,
  outputW = 0,
  outputH = 0,
): Promise<string> {
  // 1. Load source image into Skia
  const b64   = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const data  = Skia.Data.fromBase64(b64);
  const skImg = Skia.Image.MakeImageFromEncoded(data);
  if (!skImg) throw new Error('[PerspectiveWarp] MakeImageFromEncoded failed');

  const imgW = skImg.width();
  const imgH = skImg.height();

  // 2. Determine output dimensions
  let W = outputW;
  let H = outputH;
  if (!W || !H) {
    const s = computeOutputSize(srcCorners);
    W = s.width;
    H = s.height;
  }
  W = Math.max(W, 100);
  H = Math.max(H, 100);

  // 3. Destination = full output rectangle
  const dstCorners: Quad = [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: W, y: H },
    { x: 0, y: H },
  ];

  // 4. H: src image pixels → dst rectangle
  const H_fwd = computeHomography(srcCorners, dstCorners);

  // 5. H_inv: dst rectangle → src image pixels (for backward-map shader)
  const H_inv = invertMatrix3(H_fwd);

  // 6. Create output surface
  const surface = Skia.Surface.MakeOffscreen(W, H) ?? Skia.Surface.Make(W, H);
  if (!surface) throw new Error(`[PerspectiveWarp] Surface.Make(${W}×${H}) failed`);
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('white'));

  // 7. Build image shader with H_inv as localMatrix
  //    makeShaderOptions localMatrix maps draw-space coords → texture coords.
  //    H_inv(X,Y) = (x,y) = the source pixel position → correct backward mapping.
  const shader = skImg.makeShaderOptions(
    TileMode.Decal,
    TileMode.Decal,
    FilterMode.Linear,
    MipmapMode.None,
    Skia.Matrix(Array.from(H_inv)), // localMatrix: output space → source image space
  );

  const paint = Skia.Paint();
  paint.setShader(shader);
  paint.setAntiAlias(true);

  canvas.drawRect({ x: 0, y: 0, width: W, height: H }, paint);
  surface.flush();

  // 8. Encode and save
  const snapshot  = surface.makeImageSnapshot();
  const dir       = FileSystem.cacheDirectory ?? '';
  const outPath   = `${dir}warp_${Date.now()}.jpg`;

  const jpegBytes = snapshot.encodeToBytes(ImageFormat.JPEG, 92);
  const jpegB64   = Buffer.from(jpegBytes).toString('base64');
  await FileSystem.writeAsStringAsync(outPath, jpegB64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return outPath;
}

// ---------------------------------------------------------------------------
// Convenience: warp using normalized corners (0..1) relative to image size
// ---------------------------------------------------------------------------
export async function warpPerspectiveNormalized(
  uri: string,
  normalizedCorners: Quad,
): Promise<string> {
  // Load image to get real pixel dimensions
  const b64   = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const data  = Skia.Data.fromBase64(b64);
  const skImg = Skia.Image.MakeImageFromEncoded(data);
  if (!skImg) throw new Error('[PerspectiveWarp] MakeImageFromEncoded failed');

  const imgW = skImg.width();
  const imgH = skImg.height();

  const pixelCorners: Quad = normalizedCorners.map(p => ({
    x: p.x * imgW,
    y: p.y * imgH,
  })) as Quad;

  return warpPerspective(uri, pixelCorners);
}
