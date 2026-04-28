import { BasePresetFilter } from './base';
import { getSharedFilterPipeline } from '../engine/FilterPipeline';

export class CleanFilter extends BasePresetFilter {
  id = 'clean';
  name = 'Optimiert';
  icon = 'sparkles-outline';

  async apply(imageUri: string): Promise<string> {
    await this.validateImage(imageUri);
    try {
      return await getSharedFilterPipeline().apply(imageUri, this.id);
    } catch (e) {
      this.handleError('apply', e);
    }
  }
}
