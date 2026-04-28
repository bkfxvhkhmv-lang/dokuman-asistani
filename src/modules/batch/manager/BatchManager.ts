import { BatchPage, BatchConfig, PdfResult, BatchError } from '../types';
import { PdfGenerator } from './PdfGenerator';
import { PageOrganizer } from './PageOrganizer';
import { getSharedImageSessionManager } from '../../image-processing/session/ImageSessionManager';

type BatchEventMap = {
  changed: BatchPage[];
  pageAdded: BatchPage;
  pageRemoved: string;
  pageMoved: { pageId: string; newIndex: number };
  pageUpdated: BatchPage;
  selectionChanged: { pageId: string; selected: boolean };
  cleared: undefined;
  pdfGenerationStarted: undefined;
  pdfGenerationComplete: PdfResult;
  error: BatchError | { pageId: string; stage: string; message: string };
};

export class BatchManager {
  private pages: BatchPage[] = [];
  private config: BatchConfig = {
    maxPages: 50,
    autoSort: true,
    generatePdf: true,
    pdfQuality: 'high',
  };
  private listeners: {
    [K in keyof BatchEventMap]?: Array<(payload: BatchEventMap[K]) => void>;
  } = {};
  private pdfGenerator = new PdfGenerator();
  private pageOrganizer = new PageOrganizer();
  private imageSessionManager = getSharedImageSessionManager();

  constructor(config?: Partial<BatchConfig>) {
    if (config) Object.assign(this.config, config);
  }

  on<K extends keyof BatchEventMap>(eventName: K, listener: (payload: BatchEventMap[K]) => void) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName]?.push(listener);
    return this;
  }

  off<K extends keyof BatchEventMap>(eventName: K, listener: (payload: BatchEventMap[K]) => void) {
    this.listeners[eventName] = ((this.listeners[eventName] || []) as Array<(payload: BatchEventMap[K]) => void>).filter(
      current => current !== listener
    ) as any;
    return this;
  }

  private emit<K extends keyof BatchEventMap>(eventName: K, payload: BatchEventMap[K]) {
    for (const listener of this.listeners[eventName] || []) {
      try {
        listener(payload);
      } catch (error) {
        console.error(`BatchManager listener failed for ${String(eventName)}:`, error);
      }
    }
  }

  getPages(): BatchPage[] {
    return this.pageOrganizer.sort(this.pages);
  }

  getPageCount(): number {
    return this.pages.length;
  }

  addPage(page: Omit<BatchPage, 'id' | 'order' | 'createdAt'>): BatchPage {
    if (this.pages.length >= this.config.maxPages) {
      throw new Error(`Maximum ${this.config.maxPages} sayfa`);
    }

    const result = this.pageOrganizer.addPage(this.pages, page, () => this.generateId());
    this.pages = result.pages;
    const newPage = result.page;
    this.emit('pageAdded', newPage);
    this.emit('changed', this.getPages());

    return newPage;
  }

  removePage(pageId: string): boolean {
    const index = this.pages.findIndex(p => p.id === pageId);
    if (index === -1) return false;

    this.pages = this.pageOrganizer.removePage(this.pages, pageId);

    this.emit('pageRemoved', pageId);
    this.emit('changed', this.getPages());

    return true;
  }

  movePage(pageId: string, newIndex: number): boolean {
    const currentIndex = this.pages.findIndex(p => p.id === pageId);
    if (currentIndex === -1 || newIndex < 0 || newIndex >= this.pages.length) {
      return false;
    }

    this.pages = this.pageOrganizer.movePage(this.pages, pageId, newIndex);

    this.emit('pageMoved', { pageId, newIndex });
    this.emit('changed', this.getPages());

    return true;
  }

  movePageUp(pageId: string): boolean {
    const index = this.pages.findIndex(p => p.id === pageId);
    if (index <= 0) return false;
    return this.movePage(pageId, index - 1);
  }

  movePageDown(pageId: string): boolean {
    const index = this.pages.findIndex(p => p.id === pageId);
    if (index === -1 || index >= this.pages.length - 1) return false;
    return this.movePage(pageId, index + 1);
  }

  async rotatePage(pageId: string): Promise<boolean> {
    const page = this.pages.find(p => p.id === pageId);
    if (!page) return false;

    try {
      const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
      const result = await manipulateAsync(
        page.uri,
        [{ rotate: 90 }],
        { compress: 0.92, format: SaveFormat.JPEG }
      );

      this.pages = this.pageOrganizer.updatePage(this.pages, pageId, { uri: result.uri });
      const currentPage = this.pages.find(p => p.id === pageId);
      if (currentPage?.capture) {
        this.pages = this.pageOrganizer.updatePage(this.pages, pageId, {
          capture: {
            ...currentPage.capture,
            uri: result.uri,
            finalUri: result.uri,
            enhancedUri: currentPage.capture.enhancedUri ? result.uri : currentPage.capture.enhancedUri,
          },
        });
      }
      if (currentPage?.imageSession) {
        this.pages = this.pageOrganizer.updatePage(this.pages, pageId, {
          imageSession: this.imageSessionManager.update(currentPage.imageSession, {
            finalUri: result.uri,
            previewUri: undefined,
            rotation: (currentPage.imageSession.rotation ?? 0) + 90,
            editMode: 'none',
          }),
        });
      }
      const updatedPage = this.pages.find(p => p.id === pageId);
      if (updatedPage) {
        this.emit('pageUpdated', updatedPage);
      }
      this.emit('changed', this.getPages());

      return true;
    } catch (e) {
      this.emit('error', { pageId, stage: 'rotate', message: 'Döndürme başarısız' });
      return false;
    }
  }

  updatePage(pageId: string, updates: Partial<BatchPage>): boolean {
    const page = this.pages.find(p => p.id === pageId);
    if (!page) return false;

    this.pages = this.pageOrganizer.updatePage(this.pages, pageId, updates);
    const updatedPage = this.pages.find(p => p.id === pageId);
    if (updatedPage) {
      this.emit('pageUpdated', updatedPage);
    }
    this.emit('changed', this.getPages());

    return true;
  }

  attachOcr(pageId: string, ocr: BatchPage['ocr']): boolean {
    const page = this.pages.find(currentPage => currentPage.id === pageId);
    return this.updatePage(pageId, {
      ocr,
      imageSession: page?.imageSession
        ? this.imageSessionManager.update(page.imageSession, {
          ocrText: ocr?.text ?? '',
        })
        : page?.imageSession,
    });
  }

  attachMetadata(pageId: string, metadata: BatchPage['metadata']): boolean {
    const page = this.pages.find(currentPage => currentPage.id === pageId);
    return this.updatePage(pageId, {
      metadata,
      imageSession: page?.imageSession
        ? this.imageSessionManager.update(page.imageSession, {
          metadata,
          risk: typeof metadata?.risk === 'string' ? metadata.risk : page.imageSession.risk,
        })
        : page?.imageSession,
    });
  }

  selectPage(pageId: string, selected: boolean): void {
    const page = this.pages.find(p => p.id === pageId);
    if (page) {
      this.pages = this.pageOrganizer.selectPage(this.pages, pageId, selected);
      this.emit('selectionChanged', { pageId, selected });
      this.emit('changed', this.getPages());
    }
  }

  getSelectedPages(): BatchPage[] {
    return this.pageOrganizer.getSelectedPages(this.pages);
  }

  selectAll(): void {
    this.pages = this.pageOrganizer.selectAll(this.pages);
    this.emit('changed', this.getPages());
  }

  deselectAll(): void {
    this.pages = this.pageOrganizer.deselectAll(this.pages);
    this.emit('changed', this.getPages());
  }

  removeSelected(): void {
    this.pages = this.pageOrganizer.removeSelected(this.pages);
    this.emit('changed', this.getPages());
  }

  clear(): void {
    this.pages = this.pageOrganizer.clear();
    this.emit('cleared', undefined);
    this.emit('changed', this.getPages());
  }

  async generatePdf(): Promise<PdfResult> {
    if (this.pages.length === 0) {
      throw new Error('PDF oluşturmak için sayfa yok');
    }

    this.emit('pdfGenerationStarted', undefined);

    try {
      const result = await this.pdfGenerator.generate(this.getPages(), this.config);
      this.emit('pdfGenerationComplete', result);
      return result;
    } catch (e) {
      const error: BatchError = {
        stage: 'pdf',
        message: e instanceof Error ? e.message : 'PDF oluşturma başarısız',
      };
      this.emit('error', error);
      throw e;
    }
  }

  async mergeWith(other: BatchManager): Promise<void> {
    const otherPages = other.getPages();
    for (const page of otherPages) {
      this.addPage({
        uri: page.uri,
        filter: page.filter,
        corners: page.corners,
        enhanced: page.enhanced,
        capture: page.capture,
      });
    }
  }

  private generateId(): string {
    return `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  dispose(): void {
    this.listeners = {};
    this.pages = [];
  }
}
