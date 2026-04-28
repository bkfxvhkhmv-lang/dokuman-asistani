import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../../store';
import { useTheme } from '../../../ThemeContext';
import { useAuth } from '../../../providers/AuthContext';
import { useSyncEngine } from '../../../hooks/useSyncEngine';
import { useSheet } from '../../../hooks/useSheet';
import { sortByRisiko, getTageVerbleibend, getUngelesen, filterDokumente, exportiereTopluPDF } from '../../../utils';
import type { Dokument } from '../../../store';

export const TABS = ['Aufgaben', 'Dokumente', 'Ordner', 'Kalender', 'Zahlungen'] as const;

export const TYP_META: Record<string, { icon: string; farbe: string }> = {
  Rechnung:       { icon: 'receipt',        farbe: '#4A90D9' },
  Mahnung:        { icon: 'warning-circle', farbe: '#E24B4A' },
  Bußgeld:        { icon: 'car',            farbe: '#E24B4A' },
  Behörde:        { icon: 'buildings',      farbe: '#BA7517' },
  Steuer:         { icon: 'folder-open',    farbe: '#2F7D32' },
  Steuerbescheid: { icon: 'chart-bar',      farbe: '#BA7517' },
  Termin:         { icon: 'calendar',       farbe: '#1D9E75' },
  Versicherung:   { icon: 'shield-check',   farbe: '#534AB7' },
  Vertrag:        { icon: 'file-text',      farbe: '#7C6EF8' },
  Kündigung:      { icon: 'scissors',       farbe: '#E24B4A' },
  Sonstiges:      { icon: 'file',           farbe: '#888'    },
};

export function useHomeState() {
  const { state, dispatch } = useStore();
  const { Colors, RiskColors, Shadow, S, R, isDark } = useTheme();
  const { user: authUser } = useAuth();
  const { sync: runSyncEngine, status: syncStatus, lastSync: letzterSync } = useSyncEngine();
  const { config: sheetConfig, showSheet, hideSheet, confirm } = useSheet();

  const [aktiv, setAktiv]                             = useState('Aufgaben');
  const [filterOffen, setFilterOffen]                 = useState(false);
  const [filter, setFilter]                           = useState({ risiko: 'alle', typ: 'alle', sortBy: 'risiko', nurOffen: true });
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
  const alleDocs     = useMemo(() => filterDokumente(sichtbareDocs, filter).sort(compareByOutcomePriority), [sichtbareDocs, filter, compareByOutcomePriority]);
  const kalDocs      = useMemo(() => sichtbareDocs.filter(d => d.frist && isTaskVisible(d)).sort((a, b) => new Date(a.frist!).getTime() - new Date(b.frist!).getTime()), [sichtbareDocs, isTaskVisible]);
  const ungelesen    = useMemo(() => getUngelesen(state.dokumente), [state.dokumente]);
  const naechste     = kalDocs[0] ?? null;
  const naechsteTage = naechste ? getTageVerbleibend(naechste.frist) : null;
  const filterAktiv  = filter.risiko !== 'alle' || filter.typ !== 'alle';

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

  const dashStats = useMemo(() => {
    const heute = new Date(); heute.setHours(0, 0, 0, 0);
    const monatsAnfang = new Date(heute.getFullYear(), heute.getMonth(), 1);
    const docs = sichtbareDocs;
    return {
      diesenMonat: docs.filter(d => new Date(d.datum) >= monatsAnfang).length,
      wichtig:     docs.filter(d => d.risiko === 'hoch' && isTaskVisible(d)).length,
      mitDeadline: docs.filter(d => d.frist && isTaskVisible(d)).length,
      mahnungen:   docs.filter(d => d.typ === 'Mahnung' && isTaskVisible(d)).length,
      vertraege:   docs.filter(d => d.typ === 'Vertrag').length,
      duplikate:   docs.filter(d => (d as any)._duplikat).length,
      fehlend:     docs.filter(d => isTaskVisible(d) && ['Rechnung','Mahnung','Bußgeld'].includes(d.typ) && (!d.betrag || !d.frist)).length,
    };
  }, [sichtbareDocs, isTaskVisible]);

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
    if (aktiv === 'Ordner') { setVerschiebenDok(dok); setKlassorVerschiebenModal(true); }
    else { setSecilenModus(true); setSecilenIds(new Set([dok.id])); }
  }, [aktiv]);

  const handleSecim = useCallback((dok: Dokument) => {
    if (!secilenModus) return;
    setSecilenIds(prev => {
      const next = new Set(prev);
      next.has(dok.id) ? next.delete(dok.id) : next.add(dok.id);
      return next;
    });
  }, [secilenModus]);

  const secimiIptal = useCallback(() => { setSecilenModus(false); setSecilenIds(new Set()); }, []);

  const handleBatchExport = useCallback(async () => {
    const secilen = state.dokumente.filter(d => secilenIds.has(d.id));
    if (secilen.length > 1) { setMergeReihenfolge(secilen); setPdfMergeModal(true); }
    else { await exportiereTopluPDF(secilen); setSecilenModus(false); setSecilenIds(new Set()); }
  }, [state.dokumente, secilenIds]);

  const handleBatchLoeschen = useCallback(async () => {
    if (secilenIds.size === 0) return;
    const ok = await confirm({
      title: `${secilenIds.size} Dokument${secilenIds.size > 1 ? 'e' : ''} löschen?`,
      message: 'Diese Aktion kann nicht rückgängig gemacht werden.',
      icon: 'trash', tone: 'danger', confirmLabel: 'Löschen', dangerConfirm: true,
    });
    if (ok) { secilenIds.forEach(id => dispatch({ type: 'DELETE_DOKUMENT', id })); setSecilenModus(false); setSecilenIds(new Set()); }
  }, [secilenIds, dispatch, confirm]);

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
    filterOffen, setFilterOffen,
    filter, setFilter, filterAktiv,
    initialLaden, aktifOrdner, setAktifOrdner,
    secilenModus, secilenIds, secimiIptal, handleSecim, handleLongPress,
    handleBatchExport, handleBatchLoeschen,
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
