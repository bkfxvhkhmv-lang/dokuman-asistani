import { ImageFilter, FilterResult, ProcessingError } from '../types';

export class FilterPipeline {
  private filters = new Map<string, ImageFilter>();
  private activeFilter = 'original';
  private processing = false;

  registerFilter(filter: ImageFilter) {
    this.filters.set(filter.id, filter);
  }

  unregisterFilter(filterId: string) {
    this.filters.delete(filterId);
  }

  getAvailableFilters(): ImageFilter[] {
    return Array.from(this.filters.values());
  }

  setActiveFilter(filterId: string) {
    if (filterId !== 'original' && !this.filters.has(filterId)) {
      throw new Error(`Filter ${filterId} not registered`);
    }
    this.activeFilter = filterId;
  }

  getActiveFilter(): string {
    return this.activeFilter;
  }

  async processWithFilter(imageUri: string, filterId: string): Promise<FilterResult> {
    const previousFilter = this.activeFilter;
    this.setActiveFilter(filterId);
    try {
      return await this.process(imageUri);
    } finally {
      this.activeFilter = previousFilter;
    }
  }

  async process(imageUri: string): Promise<FilterResult> {
    if (this.processing) {
      throw new Error('Pipeline is already processing');
    }

    this.processing = true;
    const startTime = Date.now();

    try {
      if (this.activeFilter === 'original') {
        return {
          uri: imageUri,
          filterId: 'original',
          processingTime: Date.now() - startTime,
        };
      }

      const filter = this.filters.get(this.activeFilter);
      if (!filter) {
        throw new Error(`Filter ${this.activeFilter} not found`);
      }

      const resultUri = await filter.apply(imageUri);
      return {
        uri: resultUri,
        filterId: this.activeFilter,
        processingTime: Date.now() - startTime,
      };
    } catch (e) {
      const error: ProcessingError = {
        stage: 'filter',
        message: e instanceof Error ? e.message : 'Unknown error',
        originalUri: imageUri,
      };
      throw error;
    } finally {
      this.processing = false;
    }
  }
}
