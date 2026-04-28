import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { DEFAULT_PIPELINE_CONFIG } from '../registry/PipelineConfig';

interface CachedFilterEntry {
  uri: string;
  expiresAt: number;
}

interface CacheOptions {
  preview?: boolean;
}

const PREVIEW_TTL_MS = DEFAULT_PIPELINE_CONFIG.previewCacheTtlMs;
const FINAL_TTL_MS = DEFAULT_PIPELINE_CONFIG.finalCacheTtlMs;

export class FilterCache {
  private cache = new Map<string, CachedFilterEntry>();
  private previewSourceCache = new Map<string, CachedFilterEntry>();

  get(filterKey: string): string | null {
    const cached = this.cache.get(filterKey);
    if (!cached) return null;
    if (cached.expiresAt < Date.now()) {
      this.cache.delete(filterKey);
      return null;
    }
    return cached.uri;
  }

  set(filterKey: string, uri: string, options: CacheOptions = {}) {
    this.cache.set(filterKey, {
      uri,
      expiresAt: Date.now() + (options.preview ? PREVIEW_TTL_MS : FINAL_TTL_MS),
    });
  }

  async getPreviewSource(uri: string): Promise<string> {
    const cached = this.previewSourceCache.get(uri);
    if (cached && cached.expiresAt >= Date.now()) {
      return cached.uri;
    }

    const preview = await manipulateAsync(
      uri,
      [{ resize: { width: DEFAULT_PIPELINE_CONFIG.previewWidth } }],
      { compress: DEFAULT_PIPELINE_CONFIG.previewCompress, format: SaveFormat.JPEG }
    );

    this.previewSourceCache.set(uri, {
      uri: preview.uri,
      expiresAt: Date.now() + PREVIEW_TTL_MS,
    });

    return preview.uri;
  }

  buildKey(uri: string, filterId: string, options: CacheOptions = {}) {
    return `${uri}::${filterId}::${options.preview ? 'preview' : 'final'}`;
  }

  clearExpired() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt < now) this.cache.delete(key);
    }
    for (const [key, value] of this.previewSourceCache.entries()) {
      if (value.expiresAt < now) this.previewSourceCache.delete(key);
    }
  }
}

let sharedFilterCache: FilterCache | null = null;

export function getSharedFilterCache() {
  if (!sharedFilterCache) {
    sharedFilterCache = new FilterCache();
  }
  return sharedFilterCache;
}
