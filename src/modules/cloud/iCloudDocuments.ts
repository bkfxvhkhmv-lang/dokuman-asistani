/**
 * S6 — Apple iCloud derin klasör yönetimi için iOS File Provider /
 * expo-document-picker entegrasyonu planlanır; bu modül yalnızca platform ipucu tutar.
 */
import { Platform } from 'react-native';

export function isIosDocumentPickerContext(): boolean {
  return Platform.OS === 'ios';
}

/** CloudKit / Drive özel kapları — gelecek faz. */
export const ICLOUD_DRIVE_SYNC_PLANNED = true;
