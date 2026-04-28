import { db } from '../database/client';
import { documentEvents } from '../database/schema';
import { eq } from 'drizzle-orm';

export type EventName =
  | 'DOCUMENT_UPLOADED' | 'OCR_STARTED' | 'OCR_COMPLETED' | 'OCR_FAILED'
  | 'EMBEDDING_STARTED' | 'EMBEDDING_COMPLETED'
  | 'FIELD_UPDATED' | 'RULE_APPLIED' | 'ARCHIVED' | 'SYNC_CONFLICT';

export interface LoggedEvent {
  id: string;
  documentId: string;
  eventName: EventName;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export class EventLogger {
  static async log(documentId: string, eventName: EventName, payload: Record<string, unknown> = {}): Promise<void> {
    await db.insert(documentEvents).values({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      documentId,
      eventName,
      payload,
    });
  }

  static async getForDocument(documentId: string): Promise<LoggedEvent[]> {
    const rows = await db
      .select()
      .from(documentEvents)
      .where(eq(documentEvents.documentId, documentId))
      .orderBy(documentEvents.createdAt);

    return rows.map(r => ({
      id: r.id,
      documentId: r.documentId!,
      eventName: r.eventName as EventName,
      payload: (r.payload as Record<string, unknown>) ?? {},
      createdAt: r.createdAt ?? new Date(),
    }));
  }

  static async clearForDocument(documentId: string): Promise<void> {
    await db.delete(documentEvents).where(eq(documentEvents.documentId, documentId));
  }
}
