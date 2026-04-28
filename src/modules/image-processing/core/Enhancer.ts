import { ImagePipeline, getSharedImagePipeline } from './ImagePipeline';
import { createImageSession } from '../session/ImageSessionManager';
import type { QualityMetrics } from '../types';

export interface EnhancementResult {
  uri: string;
  preset: string;
  applied: boolean;
  quality?: QualityMetrics;
}

export class Enhancer {
  private pipeline: ImagePipeline;

  constructor(pipeline = getSharedImagePipeline()) {
    this.pipeline = pipeline;
  }

  async enhance(imageUri: string, preset = 'original'): Promise<EnhancementResult> {
    const session = createImageSession(imageUri, preset);
    const result = await this.pipeline.process(session, { filter: preset, mode: 'final' });
    return {
      uri: result.uri,
      preset: result.filterId,
      applied: result.applied,
      quality: result.quality,
    };
  }
}

export async function enhanceCapturedImage(uri: string, preset = 'original') {
  return new Enhancer().enhance(uri, preset);
}
