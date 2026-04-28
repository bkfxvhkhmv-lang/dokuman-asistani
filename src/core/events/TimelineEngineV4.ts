import { getTimeline } from '../../services/v4Api';
import { EventLogger, EventName, LoggedEvent } from './EventLogger';

export interface TimelineEntry {
  id: string;
  eventName: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  source: 'local' | 'server';
}

export class TimelineEngineV4 {
  static async getTimeline(documentId: string): Promise<TimelineEntry[]> {
    const [localEvents, serverEvents] = await Promise.allSettled([
      EventLogger.getForDocument(documentId),
      getTimeline(documentId),
    ]);

    const entries: TimelineEntry[] = [];

    if (localEvents.status === 'fulfilled') {
      for (const e of localEvents.value) {
        entries.push({ ...e, source: 'local' });
      }
    }

    if (serverEvents.status === 'fulfilled') {
      const serverList: any[] = (serverEvents.value?.events ?? (Array.isArray(serverEvents.value) ? serverEvents.value : [])) as any[];
      for (const e of serverList) {
        const alreadyLocal = entries.some(le => le.id === String(e.id));
        if (!alreadyLocal) {
          entries.push({
            id: String(e.id),
            eventName: e.event_name,
            payload: e.payload ?? {},
            createdAt: new Date(e.created_at),
            source: 'server',
          });
        }
      }
    }

    return entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  static async logLocal(documentId: string, eventName: EventName, payload: Record<string, unknown> = {}): Promise<void> {
    await EventLogger.log(documentId, eventName, payload);
  }
}
