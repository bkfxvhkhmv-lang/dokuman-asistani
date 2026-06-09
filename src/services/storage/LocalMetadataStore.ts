import { eq, and } from 'drizzle-orm';
import { db, expoDb } from '@/core/database/client';
import { localMetadata } from '@/core/database/schema';
import type { Dokument } from '@/store';

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS local_metadata (
    id TEXT PRIMARY KEY NOT NULL,
    json TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  )
`;

export class LocalMetadataStore {
  private initialized = false;

  private ensureTable(): void {
    if (this.initialized) return;
    expoDb.execSync(CREATE_TABLE_SQL);
    this.initialized = true;
  }

  async loadAll(): Promise<Dokument[]> {
    this.ensureTable();
    const rows = db.select().from(localMetadata)
      .where(eq(localMetadata.isDeleted, false))
      .all();
    return rows
      .map((r) => this.parseJson(r.id, r.json))
      .filter((d): d is Dokument => d !== null);
  }

  async load(id: string): Promise<Dokument | null> {
    this.ensureTable();
    const row = db.select().from(localMetadata)
      .where(and(eq(localMetadata.id, id), eq(localMetadata.isDeleted, false)))
      .get() ?? null;
    return row ? this.parseJson(row.id, row.json) : null;
  }

  async save(dok: Dokument): Promise<void> {
    this.ensureTable();
    const now = Math.floor(Date.now() / 1000);
    db.insert(localMetadata)
      .values({ id: dok.id, json: JSON.stringify(dok), isDeleted: false, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: localMetadata.id,
        set: { json: JSON.stringify(dok), isDeleted: false, updatedAt: now },
      })
      .run();
  }

  async delete(id: string): Promise<void> {
    this.ensureTable();
    db.update(localMetadata)
      .set({ isDeleted: true, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(localMetadata.id, id))
      .run();
  }

  private parseJson(id: string, json: string): Dokument | null {
    try {
      return JSON.parse(json) as Dokument;
    } catch {
      if (__DEV__) {
        console.warn(`[LocalMetadataStore] Ungültiges JSON für Dokument ${id} — wird übersprungen`);
      }
      return null;
    }
  }
}
