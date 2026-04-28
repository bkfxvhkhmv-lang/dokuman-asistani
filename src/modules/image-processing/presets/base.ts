import * as FileSystem from 'expo-file-system';
import type { ImageFilter } from '../types';

export abstract class BasePresetFilter implements ImageFilter {
  abstract id: string;
  abstract name: string;
  abstract icon: string;

  abstract apply(imageUri: string): Promise<string>;

  protected async validateImage(uri: string): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return info.exists;
    } catch {
      return false;
    }
  }

  protected handleError(stage: string, error: any): never {
    throw new Error(`Filter ${this.id} failed at ${stage}: ${error.message}`);
  }
}
