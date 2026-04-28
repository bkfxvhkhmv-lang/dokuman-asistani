import { BasePresetFilter } from './base';
import { getSharedFilterPipeline } from '../engine/FilterPipeline';

export class MagicFilter extends BasePresetFilter {
  id = 'magic';
  name = 'Magic Color';
  icon = 'wand-magic-sparkles';

  async apply(imageUri: string): Promise<string> {
    await this.validateImage(imageUri);
    try {
      return await getSharedFilterPipeline().apply(imageUri, this.id);
    } catch (e) {
      this.handleError('apply', e);
    }
  }
}
