export { FilterPipeline } from '@/modules/image-processing/core/FilterPipeline';
export { FilterCache, getSharedFilterCache } from '@/modules/image-processing/core/FilterCache';
export { ImagePipeline, getSharedImagePipeline } from '@/modules/image-processing/core/ImagePipeline';
export { UnifiedImagePipeline, getSharedUnifiedPipeline, enhanceCapturedImage } from '@/modules/image-processing/core/UnifiedImagePipeline';
export { Enhancer } from '@/modules/image-processing/core/Enhancer';
export { FastQualityGate, DetailedQualityAnalyzer, QualityAnalyzer } from '@/modules/image-processing/core/QualityAnalyzer';
export { analyzeCaptureResultQuality } from '@/modules/image-processing/core/QualityAnalyzer';
export { analyzeCaptureQuality, buildQualityDecisionMessage, analyzeDetailedImageQuality, checkFastQuality } from '@/modules/image-processing/core/QualityAnalyzer';
export { CropEngine, getSharedCropEngine } from '@/modules/image-processing/core/CropEngine';
export { ImageSessionManager, getSharedImageSessionManager, createImageSession } from '@/modules/image-processing/session/ImageSessionManager';
export { FilterRegistry, getSharedFilterRegistry } from '@/modules/image-processing/registry/FilterRegistry';
export { PresetRegistry, getSharedPresetRegistry } from '@/modules/image-processing/registry/PresetRegistry';
export { DEFAULT_PIPELINE_CONFIG } from '@/modules/image-processing/registry/PipelineConfig';
export { CleanFilter, BWFilter, ColorFilter, MagicFilter } from '@/modules/image-processing/presets';
export { useImagePipeline } from '@/modules/image-processing/hooks/useImagePipeline';
export { useImageSession } from '@/modules/image-processing/hooks/useImageSession';
export { useFilterPreview } from '@/modules/image-processing/hooks/useFilterPreview';
export {
  MAGIC_ERASER_PIPELINE_ENABLED,
  applyMagicEraser,
  type MagicEraserInput,
} from '@/modules/image-processing/engine/MagicEraser';
export * from '@/modules/image-processing/types';
