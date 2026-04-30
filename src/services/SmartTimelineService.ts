/**
 * Smart Timeline — V12 Sprint 2
 * Mantık `./smart-timeline/` altında; bu dosya geriye dönük import yolu sağlar.
 */
export type {
  TimelineEventType,
  TimelineEvent,
  TimelineView,
  DocumentTimeline,
  WochenZusammenfassung,
} from '@/services/smart-timeline';
export {
  extractDatesFromText,
  buildDocumentTimeline,
  buildTimelineView,
  buildWochenZusammenfassung,
} from '@/services/smart-timeline';
