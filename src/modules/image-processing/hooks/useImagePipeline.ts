import { useCallback, useReducer } from 'react';
import { getSharedUnifiedPipeline } from '../core/UnifiedImagePipeline';
import { createImageSession, getSharedImageSessionManager } from '../session/ImageSessionManager';
import { FastQualityGate } from '../core/QualityAnalyzer';
import type { CaptureResult, ScanQualityInput } from '../../scanner/types';
import type { ImageSession, ProcessingConfig, ProcessingResult, CropPixelRect } from '../types';

// ── State ─────────────────────────────────────────────────────────────────────

interface PipelineState {
  session: ImageSession | null;
  isPreparing: boolean;
  isProcessing: boolean;
  qualityMessage: string | null;
  error: string | null;
}

type PipelineAction =
  | { type: 'PREPARE_START' }
  | { type: 'PROCESS_START' }
  | { type: 'SESSION_SET'; session: ImageSession }
  | { type: 'QUALITY_MSG'; message: string }
  | { type: 'ERROR'; error: string }
  | { type: 'RESET_FLAGS' };

function reducer(state: PipelineState, action: PipelineAction): PipelineState {
  switch (action.type) {
    case 'PREPARE_START':
      return { ...state, isPreparing: true, qualityMessage: null, error: null };
    case 'PROCESS_START':
      return { ...state, isProcessing: true, error: null };
    case 'SESSION_SET':
      return { ...state, session: action.session, isPreparing: false, isProcessing: false };
    case 'QUALITY_MSG':
      return { ...state, qualityMessage: action.message, isPreparing: false };
    case 'ERROR':
      return { ...state, error: action.error, isPreparing: false, isProcessing: false };
    case 'RESET_FLAGS':
      return { ...state, isPreparing: false, isProcessing: false, qualityMessage: null, error: null };
    default:
      return state;
  }
}

const INITIAL: PipelineState = {
  session: null,
  isPreparing: false,
  isProcessing: false,
  qualityMessage: null,
  error: null,
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useImagePipeline() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const sessionManager = getSharedImageSessionManager();

  // Capture → quality gate → pipeline
  const prepareCapture = useCallback(async ({
    uri,
    width,
    height,
    filter,
  }: ScanQualityInput & { filter: string }): Promise<{ accepted: boolean; reason?: string; capture?: CaptureResult }> => {
    dispatch({ type: 'PREPARE_START' });
    try {
      const gate = new FastQualityGate();
      const gateResult = await gate.check({ uri, width, height });
      if (!gateResult.passed) {
        dispatch({ type: 'QUALITY_MSG', message: gateResult.reason ?? 'Bildqualität unzureichend.' });
        return { accepted: false, reason: gateResult.reason ?? undefined };
      }

      const pipeline = getSharedUnifiedPipeline();
      const initialSession = createImageSession(uri, filter);
      const processed = await pipeline.process(initialSession, { filter, mode: 'final' });
      dispatch({ type: 'SESSION_SET', session: processed.session });

      return {
        accepted: true,
        capture: {
          uri: processed.uri,
          originalUri: uri,
          enhancedUri: processed.applied ? processed.uri : undefined,
          finalUri: processed.uri,
          width,
          height,
          filterApplied: processed.applied ? processed.filterId : undefined,
          qualityMetrics: processed.quality,
          processing: {
            filter: processed.filterId,
            perspectiveCorrectionApplied: false,
            enhancementApplied: processed.applied,
            qualityAnalyzed: true,
          },
          timestamp: Date.now(),
        },
      };
    } catch (e: any) {
      const msg = e?.message ?? 'Verarbeitung fehlgeschlagen';
      dispatch({ type: 'ERROR', error: msg });
      return { accepted: false, reason: msg };
    }
  }, []);

  // Quick preview (low-res, cached)
  const previewFilter = useCallback(async (session: ImageSession, filterId: string): Promise<ProcessingResult | null> => {
    dispatch({ type: 'PROCESS_START' });
    try {
      const result = await getSharedUnifiedPipeline().preview(session, filterId);
      dispatch({ type: 'SESSION_SET', session: result.session });
      return result;
    } catch (e: any) {
      dispatch({ type: 'ERROR', error: e?.message ?? 'Vorschau fehlgeschlagen' });
      return null;
    }
  }, []);

  // Final filter apply
  const commitFilter = useCallback(async (session: ImageSession, filterId: string): Promise<ProcessingResult | null> => {
    dispatch({ type: 'PROCESS_START' });
    try {
      const result = await getSharedUnifiedPipeline().commitFilter(session, filterId);
      dispatch({ type: 'SESSION_SET', session: result.session });
      return result;
    } catch (e: any) {
      dispatch({ type: 'ERROR', error: e?.message ?? 'Filter fehlgeschlagen' });
      return null;
    }
  }, []);

  // Rotate 90° steps (CW by default)
  const rotateSession = useCallback(async (session: ImageSession, degrees = 90): Promise<ProcessingResult | null> => {
    dispatch({ type: 'PROCESS_START' });
    try {
      const result = await getSharedUnifiedPipeline().rotate(session, degrees);
      dispatch({ type: 'SESSION_SET', session: result.session });
      return result;
    } catch (e: any) {
      dispatch({ type: 'ERROR', error: e?.message ?? 'Rotation fehlgeschlagen' });
      return null;
    }
  }, []);

  // Crop to pixel rect
  const cropSession = useCallback(async (session: ImageSession, rect: CropPixelRect): Promise<ProcessingResult | null> => {
    dispatch({ type: 'PROCESS_START' });
    try {
      const result = await getSharedUnifiedPipeline().crop(session, rect);
      dispatch({ type: 'SESSION_SET', session: result.session });
      return result;
    } catch (e: any) {
      dispatch({ type: 'ERROR', error: e?.message ?? 'Zuschneiden fehlgeschlagen' });
      return null;
    }
  }, []);

  // Reset session back to original
  const resetSession = useCallback((session: ImageSession): ImageSession => {
    const fresh = sessionManager.reset(session);
    dispatch({ type: 'SESSION_SET', session: fresh });
    return fresh;
  }, [sessionManager]);

  // Generic low-level access
  const processSession = useCallback(async (session: ImageSession, config: ProcessingConfig = {}): Promise<ProcessingResult> => {
    return getSharedUnifiedPipeline().process(session, config);
  }, []);

  return {
    session: state.session,
    isPreparing: state.isPreparing,
    isProcessing: state.isProcessing,
    qualityMessage: state.qualityMessage,
    error: state.error,
    lastSession: state.session, // backward compat alias
    prepareCapture,
    previewFilter,
    commitFilter,
    rotateSession,
    cropSession,
    resetSession,
    processSession,
  };
}
