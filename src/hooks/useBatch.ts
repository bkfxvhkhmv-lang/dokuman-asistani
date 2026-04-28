import { useState, useCallback, useRef, useEffect } from 'react';
import { BatchManager, BatchPage, PdfResult } from '../modules/batch';

export function useBatch() {
  const managerRef = useRef<BatchManager | null>(null);
  const [pages, setPages] = useState<BatchPage[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    const manager = new BatchManager();
    managerRef.current = manager;

    const onChange = (newPages: BatchPage[]) => {
      setPages([...newPages]);
      setPageCount(newPages.length);
      setSelectedCount(newPages.filter(p => p.selected).length);
    };

    manager.on('changed', onChange);

    return () => {
      manager.dispose();
    };
  }, []);

  const addPage = useCallback((page: Omit<BatchPage, 'id' | 'order' | 'createdAt'>) => {
    return managerRef.current?.addPage(page);
  }, []);

  const removePage = useCallback((pageId: string) => {
    return managerRef.current?.removePage(pageId);
  }, []);

  const movePage = useCallback((pageId: string, newIndex: number) => {
    return managerRef.current?.movePage(pageId, newIndex);
  }, []);

  const movePageUp = useCallback((pageId: string) => {
    return managerRef.current?.movePageUp(pageId);
  }, []);

  const movePageDown = useCallback((pageId: string) => {
    return managerRef.current?.movePageDown(pageId);
  }, []);

  const rotatePage = useCallback(async (pageId: string) => {
    return await managerRef.current?.rotatePage(pageId);
  }, []);

  const updatePage = useCallback((pageId: string, updates: Partial<BatchPage>) => {
    return managerRef.current?.updatePage(pageId, updates);
  }, []);

  const attachOcr = useCallback((pageId: string, ocr: BatchPage['ocr']) => {
    return managerRef.current?.attachOcr(pageId, ocr);
  }, []);

  const attachMetadata = useCallback((pageId: string, metadata: BatchPage['metadata']) => {
    return managerRef.current?.attachMetadata(pageId, metadata);
  }, []);

  const clearPages = useCallback(() => {
    managerRef.current?.clear();
  }, []);

  const selectPage = useCallback((pageId: string, selected: boolean) => {
    managerRef.current?.selectPage(pageId, selected);
  }, []);

  const selectAll = useCallback(() => {
    managerRef.current?.selectAll();
  }, []);

  const deselectAll = useCallback(() => {
    managerRef.current?.deselectAll();
  }, []);

  const removeSelected = useCallback(() => {
    managerRef.current?.removeSelected();
  }, []);

  const generatePdf = useCallback(async (): Promise<PdfResult | null> => {
    if (!managerRef.current) return null;

    setIsGeneratingPdf(true);
    try {
      const result = await managerRef.current.generatePdf();
      return result;
    } catch (e) {
      return null;
    } finally {
      setIsGeneratingPdf(false);
    }
  }, []);

  return {
    pages,
    pageCount,
    selectedCount,
    isGeneratingPdf,
    addPage,
    removePage,
    movePage,
    movePageUp,
    movePageDown,
    rotatePage,
    updatePage,
    attachOcr,
    attachMetadata,
    clearPages,
    selectPage,
    selectAll,
    deselectAll,
    removeSelected,
    generatePdf,
  };
}
