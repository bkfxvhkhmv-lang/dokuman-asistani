/** Sticky Unterleiste Tabs — DetailAnsicht */

export const DETAIL_SCREEN_TABS = [
  { id: 'analiz', label: 'Überblick', icon: 'analytics-outline' as const },
  { id: 'ozet', label: 'Dokument', icon: 'document-text-outline' as const },
] as const;

/** Einfacher Modus: nur eine Ansicht ohne weitere Tabs */
export const DETAIL_SIMPLE_SCREEN_TABS = [DETAIL_SCREEN_TABS[1]] as const;

export type DetailScreenTabId = (typeof DETAIL_SCREEN_TABS)[number]['id'];
