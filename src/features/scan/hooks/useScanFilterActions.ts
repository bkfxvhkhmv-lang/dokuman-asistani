import { useCallback } from 'react';
import { resolveEditTransition, type EditTransitionEvent } from '@/features/scan/state/EditStateMachine';

interface UseScanFilterActionsDeps {
  activeSession: any;
  resetFilterPreview: (session: any) => void;
  setEditMode: (mode: any) => void;
  pages: any[];
  imageSessionManager: any;
  processSession: (session: any, opts: { filter: string; mode: 'final' }) => Promise<any>;
  updatePage: (id: string, payload: any) => void;
  setActiveFilter: (filter: string) => void;
  activeFilter: string;
  targetPage: any;
  setCaptureFilterId: (id: string) => void;
  loadSession: (session: any) => void;
  applyFilterPreview: (session: any, filterId?: string) => Promise<unknown>;
}

export function useScanFilterActions({
  activeSession,
  resetFilterPreview,
  setEditMode,
  pages,
  imageSessionManager,
  processSession,
  updatePage,
  setActiveFilter,
  activeFilter,
  targetPage,
  setCaptureFilterId,
  loadSession,
  applyFilterPreview,
}: UseScanFilterActionsDeps) {
  const transitionEditMode = useCallback((event: EditTransitionEvent) => {
    if (!activeSession) return resolveEditTransition('none', event);

    const transition = resolveEditTransition(activeSession.editMode ?? 'none', event);
    if (!transition.allowed) return transition;

    if (transition.exiting.some(modeName => modeName === 'filter-preview' || modeName === 'enhance')
      && transition.nextMode !== 'filter-preview'
      && transition.nextMode !== 'enhance') {
      resetFilterPreview(activeSession);
    }

    setEditMode(transition.nextMode);
    return transition;
  }, [activeSession, resetFilterPreview, setEditMode]);

  const applyFilterToPage = useCallback(async (pageId: string, filterId: string) => {
    const page = pages.find(currentPage => currentPage.id === pageId);
    if (!page) return;

    const baseSession = activeSession
      ?? page.imageSession
      ?? (page.capture ? imageSessionManager.fromCapture(page.capture) : imageSessionManager.create(page.uri, page.filter ?? 'original'));
    const processed = await processSession(baseSession, { filter: filterId, mode: 'final' });
    updatePage(pageId, {
      uri: processed.session.finalUri,
      filter: filterId,
      enhanced: processed.applied,
      imageSession: processed.session,
      capture: page.capture ? {
        ...page.capture,
        uri: processed.session.finalUri,
        enhancedUri: processed.applied ? processed.session.finalUri : page.capture.enhancedUri,
        finalUri: processed.session.finalUri,
        filterApplied: processed.applied ? filterId : undefined,
        qualityMetrics: processed.quality ?? page.capture.qualityMetrics,
        processing: {
          ...page.capture.processing,
          filter: filterId,
          enhancementApplied: processed.applied,
          qualityAnalyzed: !!processed.quality,
        },
      } : page.capture,
    });

    return processed.session;
  }, [activeSession, imageSessionManager, pages, processSession, updatePage]);

  const handleFilterChange = useCallback((filterId: string) => {
    setActiveFilter(filterId);
  }, [setActiveFilter]);

  const handleApplyFilter = useCallback(async () => {
    if (!targetPage) {
      setCaptureFilterId(activeFilter);
      return;
    }

    const startTransition = transitionEditMode('begin-filter-commit');
    const committedSession = await applyFilterToPage(targetPage.id, activeFilter);
    const finishTransition = startTransition.allowed ? resolveEditTransition(startTransition.nextMode, 'finish-filter-commit') : null;

    if (committedSession && finishTransition?.allowed) {
      loadSession(imageSessionManager.setEditMode(committedSession, finishTransition.nextMode));
      return;
    }

    if (committedSession) {
      loadSession(committedSession);
    }
  }, [activeFilter, applyFilterToPage, imageSessionManager, loadSession, targetPage, transitionEditMode, setCaptureFilterId]);

  const handleToggleFilters = useCallback(() => {
    transitionEditMode('toggle-filter-preview');
  }, [transitionEditMode]);

  const handleStartEnhance = useCallback(() => {
    if (!activeSession) return;

    const nextFilter = activeFilter === 'original' ? 'clean' : activeFilter;
    setActiveFilter(nextFilter);
    transitionEditMode('start-enhance');
    void applyFilterPreview(activeSession, nextFilter);
  }, [activeFilter, activeSession, applyFilterPreview, setActiveFilter, transitionEditMode]);

  const handleApplyFilterToAll = useCallback(async (sessionPages: any[], filterId: string) => {
    for (const page of sessionPages) {
      await applyFilterToPage(page.id, filterId);
    }
  }, [applyFilterToPage]);

  return {
    transitionEditMode,
    applyFilterToPage,
    handleFilterChange,
    handleApplyFilter,
    handleToggleFilters,
    handleStartEnhance,
    handleApplyFilterToAll,
  };
}
