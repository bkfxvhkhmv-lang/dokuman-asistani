export interface PipelineConfig {
  previewWidth: number;
  previewCompress: number;
  previewCacheTtlMs: number;
  finalCacheTtlMs: number;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  previewWidth: 480,
  previewCompress: 0.8,
  previewCacheTtlMs: 5 * 60 * 1000,
  finalCacheTtlMs: 24 * 60 * 60 * 1000,
};
