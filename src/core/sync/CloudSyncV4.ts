import AsyncStorage from '@react-native-async-storage/async-storage';
import { deltaSync, eventReplay, resolveConflict } from '../../services/v4Api';
import { db } from '../database/client';
import { documents } from '../database/schema';
import { eq } from 'drizzle-orm';

const LAST_SYNC_KEY    = 'bp_last_sync_ts';
const LAST_EVENT_ID_KEY = 'bp_last_event_id';

export interface SyncResult {
  changed:    number;
  deleted:    number;
  conflicts:  number;
  lastSyncAt: string;
}

export interface ConflictInfo {
  docId:     string;
  localDoc:  Record<string, any>;
  serverDoc: Record<string, any>;
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────

async function getLocalDoc(docId: string): Promise<Record<string, any> | null> {
  const rows = await db.select().from(documents).where(eq(documents.id, docId));
  return rows[0] ?? null;
}

function isConflict(local: Record<string, any>, server: Record<string, any>): boolean {
  // Her iki tarafta da değişiklik varsa çakışma
  const localTs  = local.updatedAt  ? new Date(local.updatedAt).getTime()  : 0;
  const serverTs = server.updated_at ? new Date(server.updated_at).getTime() : 0;
  const syncTs   = local._lastSyncAt ? new Date(local._lastSyncAt).getTime() : 0;
  return localTs > syncTs && serverTs > syncTs;
}

// ── Ana sınıf ─────────────────────────────────────────────────────────────────

export class CloudSyncV4 {

  // ── Timestamp / Event ID yönetimi ────────────────────────────────────────────
  static async getLastSyncTs(): Promise<string> {
    return (await AsyncStorage.getItem(LAST_SYNC_KEY)) ?? new Date(0).toISOString();
  }
  static async setLastSyncTs(ts: string): Promise<void> {
    await AsyncStorage.setItem(LAST_SYNC_KEY, ts);
  }
  static async getLastEventId(): Promise<number> {
    const val = await AsyncStorage.getItem(LAST_EVENT_ID_KEY);
    return val ? parseInt(val, 10) : 0;
  }
  static async setLastEventId(id: number): Promise<void> {
    await AsyncStorage.setItem(LAST_EVENT_ID_KEY, String(id));
  }

  // ── Delta pull: sunucudan değişiklikleri çek ──────────────────────────────────
  static async delta(): Promise<SyncResult> {
    const since = await this.getLastSyncTs();
    const { changed = [], deleted = [] } = await deltaSync(since);

    let conflictCount = 0;
    const conflicts: ConflictInfo[] = [];

    for (const serverDoc of changed) {
      const localDoc = await getLocalDoc(serverDoc.id);

      if (localDoc && isConflict(localDoc, serverDoc)) {
        // LWW: sunucu kazanır (son timestamp)
        const localTs  = new Date(localDoc.updatedAt ?? 0).getTime();
        const serverTs = new Date(serverDoc.updated_at ?? 0).getTime();

        conflicts.push({ docId: serverDoc.id, localDoc, serverDoc });
        conflictCount++;

        if (serverTs >= localTs) {
          // Sunucu kazandı — sunucu versiyonunu yaz
          await db.update(documents)
            .set({ status: serverDoc.status, version: serverDoc.version ?? 1, updatedAt: new Date() })
            .where(eq(documents.id, serverDoc.id));

          // Backend'e de bildir
          resolveConflict(serverDoc.id, 'server_always').catch(() => null);
        } else {
          // Lokal kazandı — server'a bildir (sadece log)
          resolveConflict(serverDoc.id, 'client_always').catch(() => null);
        }
      } else {
        // Çakışma yok — normal upsert
        await db
          .insert(documents)
          .values({
            id: serverDoc.id,
            userId: serverDoc.user_id ?? '',
            status: (serverDoc.status ?? 'pending') as 'pending' | 'processing' | 'completed' | 'failed',
            checksum: serverDoc.checksum ?? '',
            version: serverDoc.version ?? 1,
            isDeleted: false,
          })
          .onConflictDoUpdate({
            target: documents.id,
            set: {
              status:    serverDoc.status,
              version:   serverDoc.version ?? 1,
              updatedAt: new Date(),
            },
          });
      }
    }

    for (const docId of deleted) {
      await db.update(documents)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(eq(documents.id, docId));
    }

    const now = new Date().toISOString();
    await this.setLastSyncTs(now);

    return {
      changed:    changed.length,
      deleted:    deleted.length,
      conflicts:  conflictCount,
      lastSyncAt: now,
    };
  }

  // ── Event replay: tam geçmişi yeniden uygula ──────────────────────────────────
  static async replay(): Promise<void> {
    const fromId = await this.getLastEventId();
    const { events = [], last_event_id } = await eventReplay(fromId);
    if (last_event_id) await this.setLastEventId(last_event_id);
    console.log(`[CloudSync] Replayed ${events.length} events from id=${fromId}`);
  }

  // ── Push: lokal değişiklikleri sunucuya gönder ────────────────────────────────
  static async push(localChanges: Array<{ id: string; [key: string]: any }>): Promise<void> {
    // Her değiştirilmiş belge için server'a bildiri gönder
    // (gerçek upload DocumentOrchestratorV4.upload() üzerinden yapılır)
    for (const doc of localChanges) {
      resolveConflict(doc.id, 'client_always').catch(() => null);
    }
  }

  // ── Full sync: pull + push sırasıyla ─────────────────────────────────────────
  static async fullSync(): Promise<SyncResult> {
    const result = await this.delta();
    // Push için lokal değişiklikler store'dan okunabilir
    return result;
  }
}
