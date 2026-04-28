import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { FilterPipeline as EnginePipeline, getSharedFilterPipeline } from '../engine/FilterPipeline';
import { QualityAnalyzer, DetailedQualityAnalyzer } from './QualityAnalyzer';
import { FilterCache, getSharedFilterCache } from './FilterCache';
import { getSharedImageSessionManager } from '../session/ImageSessionManager';
import { optimizeDocumentImage, binarizeForOCR } from '../engine/SkiaDocumentOptimizer';
import type { ImageSession, ProcessingConfig, ProcessingResult, CropPixelRect, QualityMetrics } from '../types';

// ── Document scan output ──────────────────────────────────────────────────────

export type DocumentPreset =
  | 'auto'        // document-aware: shadows + white balance + contrast + sharpen
  | 'official'    // Behörde/brief: aggressive white + high contrast
  | 'invoice'     // Rechnung: kontrast + netlik ağırlıklı
  | 'receipt'     // Kassenbon: compact, fine detail
  | 'handwriting' // el yazısı: soft contrast, detail-preserving
  | 'id';         // kimlik: full color preserve

export interface ProcessedDocumentImage {
  originalUri:  string;
  displayUri:   string;   // color-optimized, user-visible
  ocrUri:       string;   // high-contrast B&W, for OCR / AI
  quality: {
    blurScore:        number;
    contrastScore:    number;
    brightnessScore:  number;
    ocrReadiness:     number;
    overallScore:     number;
  };
  warnings: string[];
}

// ── Standalone pipeline entry point ──────────────────────────────────────────
// Produces display + OCR outputs in one call. Use this instead of calling
// optimizeDocumentImage directly — it handles quality analysis and warnings.

export async function processDocumentImage(
  inputUri: string,
  _preset: DocumentPreset = 'auto',
): Promise<ProcessedDocumentImage> {
  // Step 1: color-preserving optimization (display quality)
  const displayUri = await optimizeDocumentImage(inputUri);

  // Step 2: binarize for OCR (high-contrast B&W from the display image)
  const ocrUri = await binarizeForOCR(displayUri);

  // Step 3: quality analysis
  const analyzer = new DetailedQualityAnalyzer();
  const report   = await analyzer.analyze(displayUri);

  return {
    originalUri: inputUri,
    displayUri,
    ocrUri,
    quality: {
      blurScore:       report.metrics.blurScore,
      contrastScore:   report.metrics.contrastScore,
      brightnessScore: report.metrics.brightnessScore,
      ocrReadiness:    report.ocrReadiness,
      overallScore:    report.metrics.overallScore,
    },
    warnings: report.recommendations,
  };
}

export class UnifiedImagePipeline {
  private engine: EnginePipeline;
  private quality: QualityAnalyzer;
  private cache: FilterCache;
  private session = getSharedImageSessionManager();

  constructor(
    engine = getSharedFilterPipeline(),
    cache = getSharedFilterCache(),
  ) {
    this.engine = engine;
    this.quality = new QualityAnalyzer();
    this.cache = cache;
  }

  get availableFilters(): string[] {
    return this.engine.availableFilters;
  }

  async preview(session: ImageSession, filterId: string): Promise<ProcessingResult> {
    return this._run(session, filterId, 'preview');
  }

  async commitFilter(session: ImageSession, filterId: string): Promise<ProcessingResult> {
    return this._run(session, filterId, 'final');
  }

  async process(session: ImageSession, config: ProcessingConfig = {}): Promise<ProcessingResult> {
    const filter = config.filter ?? session.activeFilter ?? 'original';
    const mode = config.mode ?? 'final';
    return this._run(session, filter, mode);
  }

  async rotate(session: ImageSession, degrees: number): Promise<ProcessingResult> {
    const startedAt = Date.now();
    const baseUri = this.session.getBaseImageUri(session);
    const result = await manipulateAsync(
      baseUri,
      [{ rotate: degrees }],
      { compress: 0.95, format: SaveFormat.JPEG },
    );
    const nextSession = this.session.applyRotation(session, degrees, result.uri);
    const quality = await this.quality.analyze(result.uri);
    return {
      session: this.session.update(nextSession, { quality }),
      uri: result.uri,
      filterId: session.activeFilter,
      processingTime: Date.now() - startedAt,
      applied: true,
      quality,
    };
  }

  async crop(session: ImageSession, rect: CropPixelRect): Promise<ProcessingResult> {
    const startedAt = Date.now();
    const baseUri = this.session.getBaseImageUri(session);
    const result = await manipulateAsync(
      baseUri,
      [{ crop: rect }],
      { compress: 0.92, format: SaveFormat.JPEG },
    );
    const nextSession = this.session.applyCrop(session, result.uri);
    const quality = await this.quality.analyze(result.uri);
    return {
      session: this.session.update(nextSession, { quality }),
      uri: result.uri,
      filterId: session.activeFilter,
      processingTime: Date.now() - startedAt,
      applied: true,
      quality,
    };
  }

  async enhance(uri: string, preset = 'original'): Promise<{ uri: string; preset: string; applied: boolean; quality?: QualityMetrics }> {
    const s = this.session.create(uri, preset);
    const result = await this.process(s, { filter: preset, mode: 'final' });
    return { uri: result.uri, preset: result.filterId, applied: result.applied, quality: result.quality };
  }

  private async _run(session: ImageSession, filterId: string, mode: 'preview' | 'final'): Promise<ProcessingResult> {
    const startedAt = Date.now();
    this.cache.clearExpired();

    const baseUri = mode === 'preview'
      ? this.session.getPreviewBaseUri(session)
      : this.session.getBaseImageUri(session);
    const sourceUri = mode === 'preview'
      ? await this.cache.getPreviewSource(baseUri)
      : baseUri;

    const cacheKey = this.cache.buildKey(sourceUri, filterId, { preview: mode === 'preview' });
    const cachedUri = this.cache.get(cacheKey);

    const resultUri = cachedUri ?? await this.engine.apply(sourceUri, filterId);
    if (!cachedUri) this.cache.set(cacheKey, resultUri, { preview: mode === 'preview' });

    const quality = await this.quality.analyze(sourceUri);

    let nextSession = mode === 'preview'
      ? this.session.applyPreview(session, resultUri, filterId)
      : this.session.commitFilter(session, filterId, filterId !== 'original' ? resultUri : undefined);

    nextSession = this.session.update(nextSession, { quality });
    nextSession = this.session.addEdit(nextSession, 'quality', { overallScore: quality.overallScore, mode });
    if (filterId !== 'original') {
      nextSession = this.session.addEdit(nextSession, 'filter', { filterId, mode });
    }

    return {
      session: nextSession,
      uri: mode === 'preview'
        ? (nextSession.previewUri ?? resultUri)
        : this.session.getCommittedUri(nextSession),
      filterId,
      processingTime: Date.now() - startedAt,
      applied: filterId !== 'original',
      quality,
    };
  }
}

let _shared: UnifiedImagePipeline | null = null;

export function getSharedUnifiedPipeline(): UnifiedImagePipeline {
  if (!_shared) _shared = new UnifiedImagePipeline();
  return _shared;
}

export async function enhanceCapturedImage(uri: string, preset = 'original') {
  return getSharedUnifiedPipeline().enhance(uri, preset);
}
