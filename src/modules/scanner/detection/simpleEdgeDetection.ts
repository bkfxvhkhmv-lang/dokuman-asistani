// src/modules/scanner/detection/simpleEdgeDetection.ts
export function detectEdgesSimple(
  imageData: ImageData,
  screenWidth: number,
  screenHeight: number
): DocumentCorners | null {
  // 1. Resmi küçült (performans için)
  const smallWidth = 320;
  const smallHeight = 240;
  const small = resizeImageData(imageData, smallWidth, smallHeight);
  
  // 2. Gri tonlamaya çevir
  const gray = new Uint8ClampedArray(smallWidth * smallHeight);
  for (let i = 0; i < small.data.length; i += 4) {
    gray[i/4] = small.data[i] * 0.299 + small.data[i+1] * 0.587 + small.data[i+2] * 0.114;
  }
  
  // 3. Basit kenar bulma (Sobel benzeri)
  const edges = new Uint8ClampedArray(smallWidth * smallHeight);
  for (let y = 1; y < smallHeight-1; y++) {
    for (let x = 1; x < smallWidth-1; x++) {
      const gx = gray[(y+1)*smallWidth + x] - gray[(y-1)*smallWidth + x];
      const gy = gray[y*smallWidth + (x+1)] - gray[y*smallWidth + (x-1)];
      const mag = Math.sqrt(gx*gx + gy*gy);
      edges[y*smallWidth + x] = mag > 30 ? 255 : 0;
    }
  }
  
  // 4. En büyük konturu bul (basit flood fill)
  const largestContour = findLargestContourSimple(edges, smallWidth, smallHeight);
  
  if (largestContour && largestContour.length >= 4) {
    // Köşeleri orijinal boyuta ölçekle
    const scaleX = imageData.width / smallWidth;
    const scaleY = imageData.height / smallHeight;
    return largestContour.slice(0,4).map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));
  }
  
  return null; // fallback yok, kullanıcı belgeyi çerçevelemeli
}