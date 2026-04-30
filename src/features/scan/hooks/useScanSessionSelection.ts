import { useEffect, useMemo, useCallback } from 'react';
import { resolveEditTransition } from '@/features/scan/state/EditStateMachine';

interface UseScanSessionSelectionDeps {
  pages: any[];
  editingPageId: string | null;
  loadSession: (session: any) => void;
  imageSessionManager: any;
  setActiveFilter: (filterId: string) => void;
  mode: 'camera' | 'edit' | 'batch' | 'advanced' | 'processing';
  startEditing: (pageId: string, currentMode: 'camera' | 'edit' | 'batch' | 'advanced' | 'processing') => void;
}

export function useScanSessionSelection({
  pages,
  editingPageId,
  loadSession,
  imageSessionManager,
  setActiveFilter,
  mode,
  startEditing,
}: UseScanSessionSelectionDeps) {
  const sessionPages = useMemo(() => pages.filter((page: any) => !!page.imageSession), [pages]);
  const editablePage = useMemo(
    () => sessionPages.find((page: any) => page.id === editingPageId) ?? null,
    [editingPageId, sessionPages],
  );
  const latestPage = useMemo(
    () => (sessionPages.length > 0 ? sessionPages[sessionPages.length - 1] : null),
    [sessionPages],
  );
  const targetPage = editablePage ?? latestPage;

  useEffect(() => {
    if (!targetPage) {
      loadSession(null);
      return;
    }

    const nextSession = targetPage.imageSession
      ?? (targetPage.capture
        ? imageSessionManager.fromCapture(targetPage.capture)
        : imageSessionManager.create(targetPage.uri, targetPage.filter ?? 'original'));
    loadSession(nextSession);
  }, [imageSessionManager, loadSession, targetPage]);

  const handleOpenPageEditor = useCallback((pageId: string) => {
    const page = pages.find((currentPage: any) => currentPage.id === pageId);
    if (page) {
      const nextSession = page.imageSession
        ?? (page.capture
          ? imageSessionManager.fromCapture(page.capture)
          : imageSessionManager.create(page.uri, page.filter ?? 'original'));
      const nextFilter =
        nextSession.activeFilter
        ?? page.filter
        ?? page.capture?.processing.filter
        ?? 'original';
      const openedSession = imageSessionManager.setEditMode(
        nextSession,
        resolveEditTransition(nextSession.editMode ?? 'none', 'open-editor').nextMode,
      );
      loadSession(openedSession);
      setActiveFilter(nextFilter);
    }
    startEditing(pageId, mode);
  }, [imageSessionManager, loadSession, mode, pages, setActiveFilter, startEditing]);

  return {
    sessionPages,
    editablePage,
    latestPage,
    targetPage,
    handleOpenPageEditor,
  };
}
