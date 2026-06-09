import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';

/**
 * Kuzey Kutbu metinleri (DE UI) — ürün özü:
 * ...
 */

/** Ölçüm / iletişim: müşteriye verilen net vaat (Retention + Onboarding). */
export function getTeamCustomerPromise(): string {
  return t(getLangSync(), 'strategy.customer_promise');
}

export function getProductTaglineShort(): string {
  return t(getLangSync(), 'strategy.tagline');
}

export function homeHeaderSubtitle(hasUnread: boolean, unreadCount: number): string {
  if (hasUnread && unreadCount > 0) {
    return t(getLangSync(), 'strategy.new_docs', { n: unreadCount });
  }
  return getProductTaglineShort();
}

export function getHomeAllGoodTitle(): string {
  return t(getLangSync(), 'strategy.all_good_title');
}

export function getHomeAllGoodBody(): string {
  return t(getLangSync(), 'strategy.all_good_body');
}

export function getHomeQuickFilterMeta(): string {
  return t(getLangSync(), 'strategy.quick_filter_meta');
}

export function getSearchMissionHint(): string {
  return t(getLangSync(), 'strategy.search_hint');
}

export function getDocumentsSectionEyebrow(): string {
  return t(getLangSync(), 'strategy.documents_eyebrow');
}

export function getDocumentsSectionTitle(): string {
  return t(getLangSync(), 'home.recent');
}

export function getDocumentsSectionSubline(): string {
  return t(getLangSync(), 'strategy.documents_subline');
}

/** HomeDashboardCards (QuickActions) — hero */
export function getDashboardEyebrowAllClear(): string {
  return t(getLangSync(), 'strategy.dashboard_clear');
}

export function getDashboardEyebrowBusy(): string {
  return t(getLangSync(), 'strategy.dashboard_busy');
}

export const DASHBOARD_ALL_CLEAR_MARK = '✓';

export function getDashboardAllClearText(): string {
  return t(getLangSync(), 'strategy.dashboard_clear_text');
}

export function dashboardAttentionPrimary(wichtig: number, mitDeadline: number): string {
  const deadlines = mitDeadline > 0
    ? t(getLangSync(), 'strategy.deadline_suffix', { n: mitDeadline })
    : '';
  return t(getLangSync(), 'strategy.attention', { n: wichtig, deadlines });
}
