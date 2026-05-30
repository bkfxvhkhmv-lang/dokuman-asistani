/**
 * Kuzey Kutbu metinleri (DE UI) — ürün özü:
 * ...
 */

/** Ölçüm / iletişim: müşteriye verilen net vaat (Retention + Onboarding). */
export const TEAM_CUSTOMER_PROMISE_DE =
  'Der Nutzer lädt ein Dokument hoch und weiß in Sekunden, was als Nächstes zu tun ist.';

export const PRODUCT_TAGLINE_SHORT =
  'Dokumente sicher sortieren — suchen, fristig handeln, exportieren.';

export function homeHeaderSubtitle(hasUnread: boolean, unreadCount: number): string {
  if (hasUnread && unreadCount > 0) {
    const pl = unreadCount > 1;
    return `${unreadCount} neue${pl ? '' : 's'} Dokument${pl ? 'e' : ''}`;
  }
  return PRODUCT_TAGLINE_SHORT;
}

export const HOME_ALL_GOOD_TITLE = 'Heute alles im Griff.';
export const HOME_ALL_GOOD_BODY =
  'Keine kritischen Fristen — deine Dokumente sind durchsuchbar und exportbereit.';

export const HOME_QUICK_FILTER_META =
  'Dokumente · Schnellfilter (offen / überfällig / alle)';

export const SEARCH_MISSION_HINT =
  'Suche nach Absender, Betrag, Datum, Dokumenttyp oder Stichwort — dieselben Felder nutzt du später beim Export.';

export const DOCUMENTS_SECTION_EYEBROW = 'BELEGE';
export const DOCUMENTS_SECTION_TITLE = 'Zuletzt erfasst';

export const DOCUMENTS_SECTION_SUBLINE =
  'Nach Typ sortiert — im Detail: PDF & Pakete für Buchhaltung';

/** HomeDashboardCards (QuickActions) — hero */
export const DASHBOARD_EYEBROW_ALL_CLEAR = 'ÜBERSICHT';
export const DASHBOARD_EYEBROW_BUSY = 'BELEGE · FRISTEN';
export const DASHBOARD_ALL_CLEAR_MARK = '✓';
export const DASHBOARD_ALL_CLEAR_TEXT =
  'Klassiert — nichts Überfälliges. Export für Steuer & Buchhaltung jederzeit im Dokument.';
export const DASHBOARD_ATTENTION_PRIMARY = (wichtig: number, mitDeadline: number) => {
  const head =
    wichtig === 1
      ? 'Ein Dokument erfordert Aufmerksamkeit'
      : `${wichtig} Dokumente erfordern Aufmerksamkeit`;
  return `${head}${mitDeadline > 0 ? ` · ${mitDeadline} mit Frist` : ''}.`;
};
