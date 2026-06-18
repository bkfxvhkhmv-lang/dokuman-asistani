import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '@/store';
import { useTheme } from '@/ThemeContext';
import { useAuth } from '@/providers/AuthContext';
import { useSyncEngine } from '@/hooks/useSyncEngine';
import { useSheet } from '@/hooks/useSheet';
import { sortByRisiko, getTageVerbleibend, getUngelesen, filterDokumente } from '@/utils';
import { collectSteuerpaketDokumente } from '@/services/export/steuerpaketExport';
import type { Dokument } from '@/store';

/** Persona‑Fokus: Kleinunternehmer, Angestellte, Haushalt (Belege/Garantie) · `@/product/strategyCopy` */
export const TABS = ['Aufgaben', 'Dokumente', 'Ordner', 'Kalender', 'Zahlungen'] as const;

export const TYP_META: Record<string, { icon: string; farbe: string }> = {
  Rechnung:       { icon: 'receipt',        farbe: '#4A90D9' },
  Rechnungen:    { icon: 'receipt',        farbe: '#4A90D9' },
  Mahnung:        { icon: 'warning-circle', farbe: '#E24B4A' },
  'Mahnung / Zahlungserinnerung': { icon: 'warning-circle', farbe: '#E24B4A' },
  Bußgeld:        { icon: 'car',            farbe: '#E24B4A' },
  Behörde:        { icon: 'buildings',      farbe: '#BA7517' },
  'Behörden / Amt': { icon: 'buildings',   farbe: '#BA7517' },
  Steuer:         { icon: 'folder-open',    farbe: '#2F7D32' },
  Steuerbescheid: { icon: 'chart-bar',      farbe: '#BA7517' },
  Termin:         { icon: 'calendar',       farbe: '#1D9E75' },
  Versicherung:   { icon: 'shield-check',   farbe: '#534AB7' },
  Vertrag:        { icon: 'file-text',      farbe: '#7C6EF8' },
  Verträge:       { icon: 'file-text',      farbe: '#7C6EF8' },
  Kündigung:      { icon: 'scissors',       farbe: '#E24B4A' },
  Gesundheit:     { icon: 'heart',          farbe: '#1D9E75' },
  'Schule / Kita': { icon: 'book-outline',  farbe: '#534AB7' },
  'Bank / Finanzen': { icon: 'bank',       farbe: '#4A90D9' },
  'Garantie / Kaufbeleg': { icon: 'archive', farbe: '#BA7517' },
  Sonstiges:      { icon: 'file',           farbe: '#888'    },
};

type DashStats = {
  diesenMonat: number;
  wichtig: number;
  mitDeadline: number;
  mahnungen: number;
  vertraege: number;
  duplikate: number;
  fehlend: number;
};

function computeDashStats(docs: Dokument[], isTaskVisible: (d: Dokument) => boolean): DashStats {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const monatsAnfang = new Date(heute.getFullYear(), heute.getMonth(), 1);

  const stats: DashStats = {
    diesenMonat: 0,
    wichtig: 0,
    mitDeadline: 0,
    mahnungen: 0,
    vertraege: 0,
    duplikate: 0,
    fehlend: 0,
  };

  for (const d of docs) {
    const taskVisible = isTaskVisible(d);

    if (new Date(d.datum) >= monatsAnfang) stats.diesenMonat++;
    if (d.risiko === 'hoch' && taskVisible) stats.wichtig++;
    if (d.frist && taskVisible) stats.mitDeadline++;
    if (d.typ === 'Mahnung' && taskVisible) stats.mahnungen++;
    if (d.typ === 'Vertrag') stats.vertraege++;
    if ((d as any)._duplikat) stats.duplikate++;
    if (
      taskVisible &&
      ['Rechnung', 'Mahnung', 'Bußgeld'].includes(d.typ) &&
      (!d.betrag || !d.frist)
    ) {
      stats.fehlend++;
    }
  }

  return stats;
}

export function useHomeState() {
  const { state, dispatch } = useStore();
  const { Colors, RiskColors, Shadow, S, R, isDark } = useTheme();
  const { user: authUser } = useAuth();
  const { sync: runSyncEngine, status: syncStatus, lastSync: letzterSync } = useSyncEngine();
  const { config: sheetConfig, showSheet, hideSheet, confirm, alert } = useSheet();

  // Default tab "Dokumente": Archiv + klassierte Belege (Strategie: Suche/Export).
  const [aktiv, setAktiv]                             = useState('Dokumente');
  const [filter, setFilter]                           = useState({
    risiko: 'alle',
    typ: 'alle',
    sortBy: 'risiko',
    nurOffen: false,
    quickScope: 'offen' as 'alle' | 'offen' | 'ueberfaellig',
  });
  const [initialLaden, setInitialLaden]               = useState(true);
  const [aktifOrdner, setAktifOrdner]                 = useState<string | null>(null);
  const [secilenModus, setSecilenModus]               = useState(false);
  const [secilenIds, setSecilenIds]                   = useState<Set<string>>(new Set());
  const [umbenennenModal, setUmbenennenModal]         = useState(false);
  const [umbenennenTyp, setUmbenennenTyp]             = useState('');
  const [umbenennenText, setUmbenennenText]           = useState('');
  const [kombiName, setKombiName]                     = useState('');
  const [kombiSpeichernModal, setKombiSpeichernModal] = useState(false);
  const [klassorVerschiebenModal, setKlassorVerschiebenModal] = useState(false);
  const [verschiebenDok, setVerschiebenDok]           = useState<Dokument | null>(null);
  const [pdfMergeModal, setPdfMergeModal]             = useState(false);
  const [mergeReihenfolge, setMergeReihenfolge]       = useState<Dokument[]>([]);

  const ordnerNamen = state.einstellungen?.ordnerNamen || {};

  const isTaskVisible = useCallback((d: Dokument) => !d.erledigt && !d.hideFromTasks, []);

  const compareByOutcomePriority = useCallback((a: Dokument, b: Dokument) => {
    const rank = (d: Dokument) => (d.erledigt || d.hideFromTasks || d.workflowStatus === 'bezahlt') ? 2 : 0;
    return rank(a) - rank(b);
  }, []);

  const getDokOrdnerKey = useCallback((d: Dokument) => {
    if (d.archiveBehavior === 'moveTo:Steuer') return 'Steuer';
    return d.typ || 'Sonstiges';
  }, []);

  const getOrdnerName = useCallback((typ: string) => ordnerNamen[typ] ?? (typ === 'Steuer' ? 'Steuerablage' : typ), [ordnerNamen]);

  const sichtbareDocs = useMemo(() => {
    const jetzt = new Date();
    const aktifId = state.einstellungen?.aktifProfilId;
    return state.dokumente.filter(d => {
      if (d.sichtbarBis && new Date(d.sichtbarBis) <= jetzt) return false;
      if (aktifId && d.profilId && d.profilId !== aktifId) return false;
      return true;
    });
  }, [state.dokumente, state.einstellungen?.aktifProfilId]);

  const favoriten    = useMemo(() => sichtbareDocs.filter(d => d.favorit).sort(compareByOutcomePriority), [sichtbareDocs, compareByOutcomePriority]);
  const aufgaben     = useMemo(() => sortByRisiko(sichtbareDocs.filter(isTaskVisible)), [sichtbareDocs, isTaskVisible]);
  const dringend     = useMemo(() => aufgaben.filter(d => d.risiko === 'hoch'),    [aufgaben]);
  const woche        = useMemo(() => aufgaben.filter(d => d.risiko === 'mittel'),  [aufgaben]);
  const info         = useMemo(() => aufgaben.filter(d => d.risiko === 'niedrig'), [aufgaben]);
  const alleDocs     = useMemo(() => {
    const filtered = filterDokumente(sichtbareDocs, { ...filter, sortBy: 'erfasst_neu' });
    return filtered.sort(compareByOutcomePriority);
  }, [sichtbareDocs, filter, compareByOutcomePriority]);
  const kalDocs      = useMemo(() => sichtbareDocs.filter(d => d.frist && isTaskVisible(d)).sort((a, b) => new Date(a.frist!).getTime() - new Date(b.frist!).getTime()), [sichtbareDocs, isTaskVisible]);
  const ungelesen    = useMemo(() => getUngelesen(state.dokumente), [state.dokumente]);
  const naechste     = kalDocs[0] ?? null;
  const naechsteTage = naechste ? getTageVerbleibend(naechste.frist) : null;
  const filterAktiv =
    filter.risiko !== 'alle' ||
    filter.typ !== 'alle' ||
    filter.quickScope === 'alle' ||
    filter.quickScope === 'ueberfaellig';

  const ordner = useMemo(() => {
    const map: Record<string, { typ: string; docs: Dokument[]; offen: number; letztesDatum: string | null }> = {};
    for (const d of sichtbareDocs) {
      const typ = getDokOrdnerKey(d);
      if (!map[typ]) map[typ] = { typ, docs: [], offen: 0, letztesDatum: null };
      map[typ].docs.push(d);
      if (isTaskVisible(d)) map[typ].offen++;
      if (!map[typ].letztesDatum || new Date(d.datum) > new Date(map[typ].letztesDatum!))
        map[typ].letztesDatum = d.datum;
    }
    return Object.values(map).sort((a, b) => b.offen - a.offen || b.docs.length - a.docs.length);
  }, [sichtbareDocs, isTaskVisible, getDokOrdnerKey]);

  const ordnerDocs = useMemo(() =>
    aktifOrdner ? sortByRisiko(sichtbareDocs.filter(d => getDokOrdnerKey(d) === aktifOrdner)).sort(compareByOutcomePriority) : [],
    [sichtbareDocs, aktifOrdner, getDokOrdnerKey, compareByOutcomePriority]
  );

  const zahlungsDocs = useMemo(() => sichtbareDocs.filter(d => d.betrag && d.betrag > 0), [sichtbareDocs]);
  const zahlungsGruppen = useMemo(() => {
    const ueberfaellig: Dokument[] = [], dieseWoche: Dokument[] = [], diesenMonat: Dokument[] = [], bezahlt: Dokument[] = [];
    const heute = new Date(); heute.setHours(0, 0, 0, 0);
    const wocheEnde  = new Date(heute); wocheEnde.setDate(heute.getDate() + 7);
    const monatEnde  = new Date(heute); monatEnde.setDate(heute.getDate() + 30);
    for (const d of zahlungsDocs) {
      if (d.erledigt || (d as any).workflowStatus === 'bezahlt') { bezahlt.push(d); continue; }
      if (!d.frist) { diesenMonat.push(d); continue; }
      const frist = new Date(d.frist);
      if (frist < heute) ueberfaellig.push(d);
      else if (frist <= wocheEnde) dieseWoche.push(d);
      else diesenMonat.push(d);
    }
    return { ueberfaellig, dieseWoche, diesenMonat, bezahlt };
  }, [zahlungsDocs]);

  const zahlungsSumme = useMemo(() =>
    zahlungsDocs.filter(d => !d.erledigt && (d as any).workflowStatus !== 'bezahlt').reduce((s, d) => s + (d.betrag || 0), 0),
    [zahlungsDocs]
  );

  const dashStats = useMemo(
    () => computeDashStats(sichtbareDocs, isTaskVisible),
    [sichtbareDocs, isTaskVisible]
  );

  const handleSwipeErledigt = useCallback((dok: Dokument) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    dispatch({ type: 'MARK_ERLEDIGT', id: dok.id });
  }, [dispatch]);
  const handleSwipeErtele   = useCallback((dok: Dokument) => {
    const neuFrist = new Date(); neuFrist.setDate(neuFrist.getDate() + 3);
    dispatch({ type: 'UPDATE_DOKUMENT', payload: { id: dok.id, frist: neuFrist.toISOString() } });
  }, [dispatch]);

  const handleLongPress = useCallback((dok: Dokument) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (aktiv === 'Ordner') { setVerschiebenDok(dok); setKlassorVerschiebenModal(true); return; }
    if (secilenModus) {
      setSecilenIds(prev => {
        const next = new Set(prev);
        next.has(dok.id) ? next.delete(dok.id) : next.add(dok.id);
        return next;
      });
    } else {
      setSecilenModus(true);
      setSecilenIds(new Set([dok.id]));
    }
  }, [aktiv, secilenModus]);

  const handleSecim = useCallback((dok: Dokument) => {
    if (!secilenModus) return;
    setSecilenIds(prev => {
      const next = new Set(prev);
      next.has(dok.id) ? next.delete(dok.id) : next.add(dok.id);
      return next;
    });
  }, [secilenModus]);

  const secimiIptal  = useCallback(() => { setSecilenModus(false); setSecilenIds(new Set()); }, []);
  const secimiBaslat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSecilenModus(true);
  }, []);

  const handleBatchExport = useCallback(async () => {
    const secilen = state.dokumente.filter(d => secilenIds.has(d.id));
    if (secilen.length === 0) {
      alert('Keine Dokumente ausgewählt', 'Wähle mindestens ein Dokument aus, um den Export zu starten.', { icon: 'information-circle' });
      return;
    }
    if (secilen.length > 1) { setMergeReihenfolge(secilen); setPdfMergeModal(true); return; }
    try {
      const { exportiereTopluPDF } = await import('@/utils/exporters');
      await exportiereTopluPDF(secilen);
      setSecilenModus(false);
      setSecilenIds(new Set());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'BRIEFPILOT_SHARING_UNAVAILABLE') {
        alert('Teilen nicht verfügbar', 'Das Gerät unterstützt das Teilen von Dateien nicht.', { icon: 'share', tone: 'warning' });
      } else {
        alert('Export fehlgeschlagen', 'Bitte versuche es erneut.', { icon: 'alert-circle', tone: 'warning' });
      }
    }
  }, [state.dokumente, secilenIds, alert]);

  const handleBatchLoeschen = useCallback(async () => {
    if (secilenIds.size === 0) return;
    const ok = await confirm({
      title: `${secilenIds.size} Dokument${secilenIds.size > 1 ? 'e' : ''} löschen?`,
      message: 'Du kannst die Aktion kurz danach rückgängig machen.',
      icon: 'trash', tone: 'danger', confirmLabel: 'Löschen', dangerConfirm: true,
    });
    if (!ok) return;

    const snapshots = state.dokumente.filter(d => secilenIds.has(d.id));
    secilenIds.forEach(id => dispatch({ type: 'DELETE_DOKUMENT', id }));
    setSecilenModus(false);
    setSecilenIds(new Set());

    let undone = false;
    const undoTimer = setTimeout(() => { if (!undone) hideSheet(); }, 5000);

    showSheet({
      title:   `${snapshots.length} Dokument${snapshots.length !== 1 ? 'e' : ''} gelöscht`,
      message: 'Tippe auf Rückgängig, um sie wiederherzustellen.',
      icon:    'trash',
      tone:    'default',
      actions: [
        {
          label: 'Rückgängig',
          variant: 'primary',
          onPress: () => {
            undone = true;
            clearTimeout(undoTimer);
            snapshots.forEach(snap => dispatch({ type: 'ADD_DOKUMENT', payload: snap }));
            hideSheet();
          },
        },
        {
          label: 'OK',
          variant: 'secondary',
          onPress: () => { undone = true; clearTimeout(undoTimer); hideSheet(); },
        },
      ],
    });
  }, [secilenIds, state.dokumente, dispatch, confirm, showSheet, hideSheet]);

  const handleSteuerpaketAuswahl = useCallback(async () => {
    const secilen = state.dokumente.filter(d => secilenIds.has(d.id));
    if (secilen.length === 0) return;
    const jahr = new Date().getFullYear();
    const paket = collectSteuerpaketDokumente(secilen, { jahr });
    if (paket.length === 0) {
      alert(
        'Keine Steuernachweise',
        `Unter den ${secilen.length} ausgewählten Dokumenten ist für ${jahr} nichts eindeutig steuerrelevant.`,
        { icon: 'folder-open', tone: 'default' },
      );
      return;
    }
    const { exportiereTopluPDF } = await import('@/utils/exporters');
    await exportiereTopluPDF(paket);
    setSecilenModus(false); setSecilenIds(new Set());
  }, [state.dokumente, secilenIds, alert]);

  const handleTabPress = useCallback((tab: string) => {
    setAktiv(tab);
    if (tab !== 'Ordner') setAktifOrdner(null);
  }, []);

  const handleKlassorVerschieben = useCallback((zielTyp: string) => {
    if (!verschiebenDok) return;
    dispatch({ type: 'UPDATE_DOKUMENT', payload: { id: verschiebenDok.id, typ: zielTyp } });
    if (zielTyp !== verschiebenDok.typ) {
      confirm({ title: 'Regel erstellen?', message: `Dokumente von "${verschiebenDok.absender}" immer dem Ordner "${zielTyp}" zuweisen?`,
        icon: 'sparkle', tone: 'default', cancelLabel: 'Nicht speichern', confirmLabel: 'Regel speichern',
      }).then(ok => { if (ok) dispatch({ type: 'ADD_KLASSOR_REGEL', payload: { absenderPattern: verschiebenDok.absender, zielTyp } }); });
    }
    setKlassorVerschiebenModal(false); setVerschiebenDok(null);
  }, [verschiebenDok, dispatch, confirm]);

  const handleUmbenennenSpeichern = useCallback(() => {
    const name = umbenennenText.trim();
    if (!name) return;
    dispatch({ type: 'UPDATE_EINSTELLUNGEN', payload: { ordnerNamen: { ...ordnerNamen, [umbenennenTyp]: name } } });
    setUmbenennenModal(false);
  }, [umbenennenText, umbenennenTyp, ordnerNamen, dispatch]);

  const handleUmbenennenZuruecksetzen = useCallback(() => {
    const neueNamen = { ...ordnerNamen };
    delete neueNamen[umbenennenTyp];
    dispatch({ type: 'UPDATE_EINSTELLUNGEN', payload: { ordnerNamen: neueNamen } });
    setUmbenennenModal(false);
  }, [umbenennenTyp, ordnerNamen, dispatch]);

  const lastSyncAttempt = useRef<number>(0);
  const SYNC_COOLDOWN_MS = 30_000;

  const runSync = useCallback(async () => {
    const now = Date.now();
    if (now - lastSyncAttempt.current < SYNC_COOLDOWN_MS) return;
    lastSyncAttempt.current = now;
    await runSyncEngine(dispatch, letzterSync);
    setInitialLaden(false);
  }, [runSyncEngine, dispatch, letzterSync]);

  useEffect(() => {
    runSync();
    const sub = AppState.addEventListener('change', next => { if (next === 'active') runSync(); });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    Colors, RiskColors, Shadow, S, R, isDark, authUser,
    syncStatus, letzterSync, runSync,
    sheetConfig, showSheet, hideSheet,
    state, dispatch,
    aktiv, setAktiv, handleTabPress,
    filter, setFilter, filterAktiv,
    initialLaden, aktifOrdner, setAktifOrdner,
    secilenModus, secilenIds, secimiIptal, secimiBaslat, handleSecim, handleLongPress,
    handleBatchExport, handleSteuerpaketAuswahl, handleBatchLoeschen,
    umbenennenModal, setUmbenennenModal, umbenennenTyp, setUmbenennenTyp,
    umbenennenText, setUmbenennenText, kombiName, setKombiName,
    kombiSpeichernModal, setKombiSpeichernModal,
    klassorVerschiebenModal, setKlassorVerschiebenModal,
    verschiebenDok, handleKlassorVerschieben,
    handleUmbenennenSpeichern, handleUmbenennenZuruecksetzen,
    pdfMergeModal, setPdfMergeModal, mergeReihenfolge, setMergeReihenfolge,
    sichtbareDocs, favoriten, aufgaben, dringend, woche, info,
    alleDocs, kalDocs, naechste, naechsteTage, ungelesen,
    ordner, ordnerDocs, getOrdnerName, ordnerNamen,
    zahlungsDocs, zahlungsGruppen, zahlungsSumme, dashStats,
    handleSwipeErledigt, handleSwipeErtele,
    TYP_META,
  };
}
