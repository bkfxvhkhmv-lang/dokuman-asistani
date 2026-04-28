import type { SensitiveRegion } from '../types';

/**
 * BlurEngine — manages redaction regions for sensitive data.
 *
 * Image-level pixel manipulation is not possible in JS without native modules.
 * This engine tags URIs and maintains a redaction registry so the PDF export
 * layer (PdfGenerator) can overlay black boxes in the HTML template.
 * For on-screen display, use BlurEngine.getRegions() to drive View overlays.
 */
export class BlurEngine {
  private static registry = new Map<string, SensitiveRegion[]>();

  async blur(imageUri: string, regions: SensitiveRegion[]): Promise<string> {
    if (!regions.length) return imageUri;
    const baseUri = this.stripTag(imageUri);
    BlurEngine.registry.set(baseUri, regions);
    return `${baseUri}?redacted=1`;
  }

  async unblur(imageUri: string): Promise<string> {
    const baseUri = this.stripTag(imageUri);
    BlurEngine.registry.delete(baseUri);
    return baseUri;
  }

  static getRegions(imageUri: string): SensitiveRegion[] {
    const key = imageUri.replace(/\?redacted=1$/, '');
    return BlurEngine.registry.get(key) ?? [];
  }

  static isRedacted(imageUri: string): boolean {
    return imageUri.endsWith('?redacted=1');
  }

  static buildCssOverlays(regions: SensitiveRegion[], imgW: number, imgH: number): string {
    return regions
      .map(r => {
        const left = Math.round(r.x * imgW);
        const top = Math.round(r.y * imgH);
        const width = Math.round(r.width * imgW);
        const height = Math.round(r.height * imgH);
        return `<div style="position:absolute;left:${left}px;top:${top}px;width:${width}px;height:${height}px;background:#000;border-radius:2px;" aria-hidden="true"></div>`;
      })
      .join('\n');
  }

  private stripTag(uri: string): string {
    return uri.replace(/\?redacted=1$/, '');
  }
}
