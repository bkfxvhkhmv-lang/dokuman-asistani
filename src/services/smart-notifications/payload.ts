export interface NotificationPayload {
  type: 'upload' | 'daily_digest' | 'smart_reminder' | 'template_reminder';
  dokId?: string;
}

export function parseNotificationData(data: Record<string, unknown>): NotificationPayload | null {
  if (!data?.type) return null;
  return data as unknown as NotificationPayload;
}
