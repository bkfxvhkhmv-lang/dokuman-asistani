import { nativeApplyFilter } from '../../scanner/engine/NativeStub';
import { BasePresetFilter } from './base';

export class ColorFilter extends BasePresetFilter {
  id = 'color';
  name = 'Renk Düzeltme';
  icon = 'palette';

  async apply(imageUri: string): Promise<string> {
    try {
      const native = await nativeApplyFilter(imageUri, this.id);
      if (native !== imageUri) return native;
      return imageUri;
    } catch (e) {
      this.handleError('apply', e);
    }
  }
}
