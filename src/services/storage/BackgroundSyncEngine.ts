import type { Dokument } from '@/store';
import { LocalMetadataStore } from './LocalMetadataStore';
import { CloudMetadataStore } from './CloudMetadataStore';
import { resolveConflictBatch } from './ConflictResolver';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  pendingCount: number;
  errorMessage: string | null;
}

type Listener = (state: SyncState) => void;

export class BackgroundSyncEngine {
  private status: SyncStatus = 'idle';
  private lastSyncAt: string | null = null;
  private pendingCount = 0;
  private errorMessage: string | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Listener[] = [];
  /**
   * Promise lock — all concurrent syncNow() calls share the same in-flight
   * promise, so the real sync operation runs exactly once per cycle.
   */
  private syncPromise: Promise<SyncState> | null = null;

  constructor(
    private local: LocalMetadataStore,
    private cloud: CloudMetadataStore,
    private intervalMs: number = 5 * 60 * 1000,
  ) {}

  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      void this.syncNow();
    }, this.intervalMs);

    void this.syncNow();
  }

  stop(): void {
    if (!this.intervalId) return;

    clearInterval(this.intervalId);
    this.intervalId = null;
    this.status = 'idle';
    this.notify();
  }

  async syncNow(): Promise<SyncState> {
    // If a sync is already in flight, all callers share the same promise —
    // the real work runs exactly once regardless of how many call syncNow().
    if (this.syncPromise) return this.syncPromise;

    this.syncPromise = (async () => {
      try {
        await this.performSync();
      } finally {
        this.syncPromise = null;
      }
      return this.getState();
    })();

    return this.syncPromise;
  }

  getState(): SyncState {
    return {
      status: this.status,
      lastSyncAt: this.lastSyncAt,
      pendingCount: this.pendingCount,
      errorMessage: this.errorMessage,
    };
  }

  onStateChange(cb: Listener): () => void {
    this.listeners.push(cb);
    cb(this.getState());

    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== cb);
    };
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  private async performSync(): Promise<void> {
    this.status = 'syncing';
    this.errorMessage = null;
    this.notify();

    try {
      const lokaleDokumente = await this.local.loadAll();
      this.pendingCount = lokaleDokumente.length;

      const syncResult = await this.cloud.sync(lokaleDokumente);
      const remoteDokumente = await this.cloud.loadAll();

      const lokaleMap = new Map(lokaleDokumente.map((dok) => [dok.id, dok]));
      const konfliktPaare: Array<{ local: Dokument; remote: Dokument }> = [];

      for (const remoteDok of remoteDokumente) {
        const lokalesDok = lokaleMap.get(remoteDok.id);

        if (!lokalesDok) {
          await this.local.save(remoteDok);
          continue;
        }

        if (
          lokalesDok.datum !== remoteDok.datum ||
          lokalesDok.titel !== remoteDok.titel ||
          lokalesDok.erledigt !== remoteDok.erledigt
        ) {
          konfliktPaare.push({ local: lokalesDok, remote: remoteDok });
        }
      }

      if (syncResult.conflicts > 0 || konfliktPaare.length > 0) {
        const geloesteKonflikte = resolveConflictBatch(konfliktPaare, 'newer_wins');
        for (const konflikt of geloesteKonflikte) {
          await this.local.save(konflikt.resolved);
          await this.cloud.save(konflikt.resolved);
        }
      }

      this.lastSyncAt = new Date().toISOString();
      this.pendingCount = 0;
      this.status = 'idle';
      this.errorMessage = null;
      this.notify();
    } catch (fehler) {
      this.status = 'error';
      this.errorMessage = fehler instanceof Error ? fehler.message : 'Synchronisierung fehlgeschlagen';
      this.notify();
    }
  }
}
