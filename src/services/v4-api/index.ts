export { BASE } from './client';
export type * from './types';

export {
  uploadDocumentV4,
  downloadDocumentV4,
  shareOriginalFile,
  downloadOriginalFileToCache,
  uploadDocumentV4Safe,
  getDocumentV4,
  listDocumentsV4,
  deleteDocumentV4,
} from './documents';

export { explainDocument, getAiLanguages, chatWithDocument } from './ai';

export {
  createShareLink,
  revokeShareLink,
  getTimeline,
  hybridSearch,
  browseMarketplace,
  installRule,
  uninstallRule,
  rateRule,
  getPendingApprovals,
  resolveApproval,
  getPricingForecast,
  getSubscriptionAdvice,
  deltaSync,
  eventReplay,
  resolveConflict,
  getHealthStatus,
} from './operations';

export { explainDocumentSafe, getDocumentV4Safe, smartSearch } from './retrySafe';
