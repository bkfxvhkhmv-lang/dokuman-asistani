import { useCallback, useMemo, useState } from 'react';
import { getSharedUnifiedPipeline } from '../core/UnifiedImagePipeline';
import { createImageSession } from '../session/ImageSessionManager';
import { getSharedPresetRegistry } from '../registry/PresetRegistry';
import type { ImageSession } from '../types';

export function useFilterPreview() {
  const pipeline = useMemo(() => getSharedUnifiedPipeline(), []);
  const presetRegistry = useMemo(() => getSharedPresetRegistry(), []);
  const [activeId, setActiveId] = useState('original');
  const [processing, setProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const applyFilter = useCallback(async (source: string | ImageSession, filterId = activeId) => {
    setProcessing(true);
    try {
      const currentSession = typeof source === 'string'
        ? createImageSession(source, filterId)
        : source;
      const result = await pipeline.process(currentSession, {
        filter: filterId,
        mode: 'preview',
      });
      setActiveId(filterId);
      setPreviewUri(result.uri);
      return result;
    } catch (error) {
      console.error('Filter preview failed:', error);
      const fallbackUri = typeof source === 'string'
        ? source
        : source.previewUri ?? source.finalUri ?? source.originalUri;
      setPreviewUri(fallbackUri);
      return null;
    } finally {
      setProcessing(false);
    }
  }, [activeId, pipeline]);

  const reset = useCallback((source: string | ImageSession) => {
    const nextSession = typeof source === 'string'
      ? createImageSession(source, 'original')
      : source;
    setActiveId(nextSession.activeFilter || 'original');
    setPreviewUri(nextSession.previewUri ?? nextSession.finalUri ?? nextSession.originalUri);
  }, []);

  return {
    presets: presetRegistry.getPresets(),
    activeId,
    setActiveId,
    processing,
    previewUri,
    setPreviewUri,
    applyFilter,
    reset,
  };
}
