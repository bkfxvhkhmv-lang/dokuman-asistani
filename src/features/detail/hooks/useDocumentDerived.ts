import { useMemo } from 'react';
import type { Dokument, StoreState } from '../../../store';
import type { ColorPalette, RiskPalette } from '../../../theme';
import {
  getRisikoInfo,
  berechneGesundheitsscore,
  extrahiereOzetKartlari,
  analysiereVertragRisiken,
  berechneHukukiRiskSkoru,
  analysiereAllgemeinRisiken,
  schlagoEtikettenVor,
  findeAehnlicheDokumente,
  schaetzeOcrRisiko,
  baueBeziehungsGraph,
  berechneOptimaleHatirlatmaZeit,
  extrahereFelderErweitert,
  generiereAufgabenVorschlaege,
  erkenneDarkPatterns,
  findeOzetQuellen,
} from '../../../utils';

interface UseDocumentDerivedParams {
  dok: Dokument | undefined;
  dokId: string;
  state: StoreState;
  Colors: ColorPalette & { hoch: string; mittel: string; niedrig: string };
  RiskColors: RiskPalette;
  ozetQuellenSichtbar: boolean;
}

export function useDocumentDerived({
  dok,
  dokId,
  state,
  Colors,
  RiskColors,
  ozetQuellenSichtbar,
}: UseDocumentDerivedParams) {
  const C = Colors;

  const info = useMemo(() => getRisikoInfo(dok?.risiko ?? 'niedrig', RiskColors), [dok?.risiko, RiskColors]);

  const score      = useMemo(() => (dok ? berechneGesundheitsscore(dok) : 0), [dok]);
  const scoreColor = score >= 75 ? C.success : score >= 45 ? C.warning : C.danger;

  const ozetKartlari = useMemo(() => (dok ? extrahiereOzetKartlari(dok) : []), [dok]);

  const vertragRisiken = useMemo(
    () => (dok?.typ === 'Vertrag' ? analysiereVertragRisiken(dok.rohText) : []),
    [dok]
  );

  const hukukiRisiken  = useMemo(() => (dok ? analysiereAllgemeinRisiken(dok) : []), [dok]);
  const hukukiSkor     = useMemo(() => berechneHukukiRiskSkoru(hukukiRisiken), [hukukiRisiken]);
  const hukukiSkorColor = hukukiSkor >= 60 ? C.danger : hukukiSkor >= 30 ? C.warning : C.success;

  const etiketVorschlaege = useMemo(
    () => (dok ? schlagoEtikettenVor(dok, state.einstellungen?.etikettenVerlauf || []) : []),
    [dok, state.einstellungen?.etikettenVerlauf]
  );

  const aehnlicheDoks = useMemo(
    () => (dok ? findeAehnlicheDokumente(dok, state.dokumente) : []),
    [dok, state.dokumente]
  );

  const ocrRisiken = useMemo(() => schaetzeOcrRisiko(dok?.rohText), [dok?.rohText]);

  const graph = useMemo(
    () => (dok ? baueBeziehungsGraph(dok, state.dokumente) : { nodes: [], edges: [] }),
    [dok, state.dokumente]
  );

  const hatirlatmaVorschlaege = useMemo(
    () => (dok ? berechneOptimaleHatirlatmaZeit(dok) : []),
    [dok]
  );

  const darkPatterns       = useMemo(() => (dok ? erkenneDarkPatterns(dok) : []), [dok]);
  const aufgabenVorschlaege = useMemo(() => (dok ? generiereAufgabenVorschlaege(dok) : []), [dok]);

  const aktiveSablon = useMemo(
    () => (state.einstellungen?.aktiveSablonlari || []).filter(s => s.dokId === dokId),
    [dokId, state.einstellungen?.aktiveSablonlari]
  );

  const mevcutEtiketten = dok?.etiketten || [];
  const aufgaben        = dok?.aufgaben  || [];
  const offeneAufgaben  = aufgaben.filter(a => !a.erledigt).length;
  const kisayollar      = state.einstellungen?.kisayollar || [];

  const extrahierteFelder = useMemo(
    () => (dok ? extrahereFelderErweitert(dok.rohText ?? '', dok.typ) : []),
    [dok]
  );

  const ozetQuellen = useMemo(
    () => (ozetQuellenSichtbar && dok ? findeOzetQuellen(dok.rohText, dok.zusammenfassung) : []),
    [ozetQuellenSichtbar, dok]
  );

  return {
    info,
    score,
    scoreColor,
    ozetKartlari,
    vertragRisiken,
    hukukiRisiken,
    hukukiSkor,
    hukukiSkorColor,
    etiketVorschlaege,
    aehnlicheDoks,
    ocrRisiken,
    graph,
    hatirlatmaVorschlaege,
    darkPatterns,
    aufgabenVorschlaege,
    aktiveSablon,
    mevcutEtiketten,
    aufgaben,
    offeneAufgaben,
    kisayollar,
    extrahierteFelder,
    ozetQuellen,
  };
}
