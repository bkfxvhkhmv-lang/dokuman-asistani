import { BatchPage } from '../types';

export class PageOrganizer {
  sort(pages: BatchPage[]): BatchPage[] {
    return [...pages].sort((a, b) => a.order - b.order);
  }

  addPage(
    pages: BatchPage[],
    page: Omit<BatchPage, 'id' | 'order' | 'createdAt'>,
    idFactory: () => string
  ): { pages: BatchPage[]; page: BatchPage } {
    const newPage: BatchPage = {
      ...page,
      id: idFactory(),
      order: pages.length,
      createdAt: Date.now(),
    };

    return {
      pages: [...pages, newPage],
      page: newPage,
    };
  }

  removePage(pages: BatchPage[], pageId: string): BatchPage[] {
    return this.renumber(pages.filter(page => page.id !== pageId));
  }

  movePage(pages: BatchPage[], pageId: string, newIndex: number): BatchPage[] {
    const currentIndex = pages.findIndex(page => page.id === pageId);
    if (currentIndex === -1 || newIndex < 0 || newIndex >= pages.length) {
      return pages;
    }

    const nextPages = [...pages];
    const [page] = nextPages.splice(currentIndex, 1);
    nextPages.splice(newIndex, 0, page);
    return this.renumber(nextPages);
  }

  updatePage(pages: BatchPage[], pageId: string, updates: Partial<BatchPage>): BatchPage[] {
    return pages.map(page => (page.id === pageId ? { ...page, ...updates } : page));
  }

  selectPage(pages: BatchPage[], pageId: string, selected: boolean): BatchPage[] {
    return pages.map(page => (page.id === pageId ? { ...page, selected } : page));
  }

  selectAll(pages: BatchPage[]): BatchPage[] {
    return pages.map(page => ({ ...page, selected: true }));
  }

  deselectAll(pages: BatchPage[]): BatchPage[] {
    return pages.map(page => ({ ...page, selected: false }));
  }

  removeSelected(pages: BatchPage[]): BatchPage[] {
    return this.renumber(pages.filter(page => !page.selected));
  }

  getSelectedPages(pages: BatchPage[]): BatchPage[] {
    return pages.filter(page => page.selected);
  }

  clear(): BatchPage[] {
    return [];
  }

  private renumber(pages: BatchPage[]): BatchPage[] {
    return pages.map((page, index) => ({
      ...page,
      order: index,
    }));
  }
}
