import type { ImageSession, ProcessingConfig, ProcessingResult } from '../types';
import { FilterPipeline } from './FilterPipeline';
import { QualityAnalyzer } from './QualityAnalyzer';
import { FilterCache, getSharedFilterCache } from './FilterCache';
import { getSharedFilterRegistry } from '../registry/FilterRegistry';
import { getSharedImageSessionManager } from '../session/ImageSessionManager';

export class ImagePipeline {
  private filterPipeline: FilterPipeline;
  private qualityAnalyzer: QualityAnalyzer;
  private filterCache: FilterCache;
  private sessionManager = getSharedImageSessionManager();

  constructor() {
    this.filterPipeline = new FilterPipeline();
    getSharedFilterRegistry().getFilters().forEach(filter => this.filterPipeline.registerFilter(filter));
    this.qualityAnalyzer = new QualityAnalyzer();
    this.filterCache = getSharedFilterCache();
  }

  createSession(originalUri: string, filter = 'original') {
    return this.sessionManager.create(originalUri, filter);
  }

  getAvailableFilters() {
    return this.filterPipeline.getAvailableFilters();
  }

  async process(session: ImageSession, config: ProcessingConfig = {}): Promise<ProcessingResult> {
    const startedAt = Date.now();
    const filter = config.filter ?? session.activeFilter ?? 'original';
    const mode = config.mode ?? 'final';
    this.filterCache.clearExpired();

    const baseSourceUri = mode === 'preview'
      ? this.sessionManager.getPreviewBaseUri(session)
      : this.sessionManager.getBaseImageUri(session);
    const sourceUri = mode === 'preview'
      ? await this.filterCache.getPreviewSource(baseSourceUri)
      : baseSourceUri;

    const cacheKey = this.filterCache.buildKey(sourceUri, filter, { preview: mode === 'preview' });
    const cachedUri = this.filterCache.get(cacheKey);
    const quality = await this.qualityAnalyzer.analyze(sourceUri);
    const filterResult = cachedUri
      ? { uri: cachedUri, filterId: filter, processingTime: 0 }
      : await this.filterPipeline.processWithFilter(sourceUri, filter);

    if (!cachedUri) {
      this.filterCache.set(cacheKey, filterResult.uri, { preview: mode === 'preview' });
    }

    let processedSession = mode === 'preview'
      ? this.sessionManager.applyPreview(session, filterResult.uri, filter)
      : this.sessionManager.commitFilter(session, filter, filterResult.filterId !== 'original' ? filterResult.uri : undefined);

    processedSession = this.sessionManager.update(processedSession, {
      quality,
    });
    processedSession = this.sessionManager.addEdit(processedSession, 'quality', { overallScore: quality.overallScore, mode });
    if (filter !== 'original') {
      processedSession = this.sessionManager.addEdit(processedSession, 'filter', { filter, mode });
    }

    return {
      session: processedSession,
      uri: mode === 'preview'
        ? (processedSession.previewUri ?? filterResult.uri)
        : this.sessionManager.getCommittedUri(processedSession),
      filterId: filterResult.filterId,
      processingTime: Date.now() - startedAt,
      applied: filterResult.filterId !== 'original',
      quality,
    };
  }
}

let sharedImagePipeline: ImagePipeline | null = null;

export function getSharedImagePipeline() {
  if (!sharedImagePipeline) {
    sharedImagePipeline = new ImagePipeline();
  }
  return sharedImagePipeline;
}
