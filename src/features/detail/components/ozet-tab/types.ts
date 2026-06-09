import type { Dokument, ActionHistoryEntry } from '@/store';
import type { RiskEntry, OzetKarte } from '@/utils/types';
import type { DocIntent } from '@/features/detail/hooks/useDocumentAI';
import type { OutcomePrediction } from '@/core/intelligence/OutcomePredictor';
import type { DocumentChain } from '@/features/detail/services/documentChainEngine';
import type { ActionPlan } from '@/features/detail/components/ActionsPanel';

export interface OzetTabProps {
  dok: Dokument;
  info: RiskEntry & { emoji?: string };
  score: number;
  scoreColor: string;
  docIntent?: DocIntent | null;
  outcomePrediction?: OutcomePrediction | null;
  kontaktName?: string | null;
  onKontaktVerknuepfen: () => void;
  onSimulator?: () => void;
  anonModus?: boolean;
  ozetKartlari?: OzetKarte[];
  onOzetAktion?: (aktion: string) => void;
  onMailTaslak: () => void;
  ozetQuellenSichtbar: boolean;
  setOzetQuellenSichtbar: (fn: (v: boolean) => boolean) => void;
  documentChain?: DocumentChain | null;
  onOpenPages?: (initialIndex?: number) => void;
  /** Einfacher Detail-Modus — reduzierte Blöcke unter der Hero-Karte */
  simpleLayout?: boolean;
  /** Scroll padding bottom (FAB + tab bar clearance) */
  scrollBottomPadding?: number;
  /** Für „Nächster Schritt“-Zeile und Simple-Ansicht */
  actionPlan?: ActionPlan | null;
  naechsterSchrittZeile?: string | null;
  /** True wenn FAB oder Frist-Streifen dieselbe Info zeigen — kein grünes NÄCHSTER SCHRITT-Banner */
  suppressNextStepBanner?: boolean;
  /** z. B. `zahlen` | `kalender` — gleiche Schnellaktion nicht nochmal auf der KURZÜBERSICHT-Karte */
  suppressOzetKartePrimaryAktion?: string | null;
  onSimpleZahlen?: () => void;
  onSimpleKalender?: () => void;
  onSimpleHilfe?: () => void;
  /** Server-Pipeline erneut (Upload + Poll); z. B. nach `v4JobStatus === failed`. */
  onRetryPipelineAnalysis?: () => void;
  /** Kategorie / Nutzer-Ordner — öffnet Bearbeiten (Klassifikation). */
  onKlassifikationBearbeiten?: () => void;
}
