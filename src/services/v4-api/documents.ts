import { req } from './client';
import type { V4Document, V4DocumentList } from './types';

export {
  uploadDocumentV4,
  downloadDocumentV4,
  shareOriginalFile,
  downloadOriginalFileToCache,
  uploadDocumentV4Safe,
} from '@/services/v4FileService';

export async function getDocumentV4(docId: string): Promise<V4Document> {
  return req<V4Document>('GET', `/documents/${docId}`);
}

export async function listDocumentsV4({ limit = 50, offset = 0 } = {}): Promise<V4DocumentList> {
  return req<V4DocumentList>('GET', `/documents/?limit=${limit}&offset=${offset}`);
}

export async function deleteDocumentV4(docId: string): Promise<unknown> {
  return req('DELETE', `/documents/${docId}`);
}
