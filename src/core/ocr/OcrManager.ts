import * as FileSystem from 'expo-file-system/legacy';
import type { OcrResult, OcrBatchResult, OcrCaptureInput } from '../../modules/ocr/types';
export type { OcrBatchResult };

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';
const LANGUAGE_HINTS = ['de', 'en', 'tr'];

export type OcrProvider = 'vision_api' | 'backend' | 'local_stub';

export interface OcrManagerConfig {
  visionApiKey?: string;
  backendEndpoint?: string;
  preferredProvider?: OcrProvider;
}

export interface OcrManagerResult extends OcrResult {
  provider: OcrProvider;
  durationMs: number;
}

/**
 * OCR Manager with tiered fallback:
 * 1. Google Vision API (primary — best quality)
 * 2. BriefPilot backend OCR endpoint (fallback — no client key needed)
 * 3. Local stub (offline — returns empty with warning)
 */
export class OcrManager {
  private visionApiKey: string | null = null;
  private backendEndpoint: string | null = null;
  private preferredProvider: OcrProvider;

  constructor(config: OcrManagerConfig = {}) {
    this.visionApiKey = config.visionApiKey ?? process.env.EXPO_PUBLIC_VISION_API_KEY ?? null;
    this.backendEndpoint = config.backendEndpoint ?? process.env.EXPO_PUBLIC_OCR_ENDPOINT ?? null;
    this.preferredProvider = config.preferredProvider ?? 'vision_api';
  }

  async recognize(imageUri: string): Promise<OcrManagerResult> {
    const t0 = Date.now();

    // Try providers in priority order
    const providers: Array<() => Promise<OcrResult | null>> = [];

    if (this.preferredProvider === 'vision_api' || !this.preferredProvider) {
      providers.push(() => this.tryVisionApi(imageUri));
      providers.push(() => this.tryBackend(imageUri));
    } else if (this.preferredProvider === 'backend') {
      providers.push(() => this.tryBackend(imageUri));
      providers.push(() => this.tryVisionApi(imageUri));
    }
    providers.push(() => this.localStub());

    for (const provider of providers) {
      try {
        const result = await provider();
        if (result) {
          return { ...result, provider: this.resolveProviderName(provider), durationMs: Date.now() - t0 };
        }
      } catch (e) {
        // Continue to next provider
      }
    }

    return { text: '', confidence: 0, blocks: [], provider: 'local_stub', durationMs: Date.now() - t0 };
  }

  async recognizeBatch(inputs: OcrCaptureInput[]): Promise<OcrBatchResult> {
    const results = await Promise.all(
      inputs.map(input => this.recognize(input.finalUri || input.originalUri).catch(() => this.emptyResult()))
    );

    const text = results.map(r => r.text).filter(Boolean).join('\n\n');
    const validConf = results.map(r => r.confidence).filter(c => c > 0);
    const confidence = validConf.length ? Math.round(validConf.reduce((a, b) => a + b, 0) / validConf.length) : null;

    return {
      text,
      confidence,
      pages: inputs.map((input, i) => ({
        uri: input.finalUri || input.originalUri,
        text: results[i].text,
        confidence: results[i].confidence ?? null,
      })),
    };
  }

  private async tryVisionApi(imageUri: string): Promise<OcrResult | null> {
    if (!this.visionApiKey) return null;

    const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
    const response = await fetch(`${VISION_API_URL}?key=${this.visionApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          imageContext: { languageHints: LANGUAGE_HINTS },
        }],
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const annotation = data.responses?.[0]?.fullTextAnnotation;
    if (!annotation?.text) return null;

    return {
      text: annotation.text,
      confidence: Math.round((annotation.pages?.[0]?.confidence ?? 0.85) * 100),
      blocks: [],
      language: annotation.pages?.[0]?.property?.detectedLanguages?.[0]?.languageCode ?? 'de',
    };
  }

  private async tryBackend(imageUri: string): Promise<OcrResult | null> {
    if (!this.backendEndpoint) return null;

    const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
    const response = await fetch(`${this.backendEndpoint}/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, languages: LANGUAGE_HINTS }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data.text) return null;

    return {
      text: data.text,
      confidence: data.confidence ?? 70,
      blocks: data.blocks ?? [],
      language: data.language ?? 'de',
    };
  }

  private async localStub(): Promise<OcrResult | null> {
    console.warn('[OcrManager] All OCR providers unavailable — returning empty result');
    return null;
  }

  private emptyResult(): OcrManagerResult {
    return { text: '', confidence: 0, blocks: [], provider: 'local_stub', durationMs: 0 };
  }

  getActiveProvider(): OcrProvider {
    return this.preferredProvider;
  }

  private resolveProviderName(fn: Function): OcrProvider {
    const src = fn.toString();
    if (src.includes('tryVisionApi')) return 'vision_api';
    if (src.includes('tryBackend')) return 'backend';
    return 'local_stub';
  }
}
