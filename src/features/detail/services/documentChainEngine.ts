import type { Dokument } from '../../../store';

type ChainType = 'bussgeld' | 'forderung' | 'garantie' | 'rechnung' | 'vertrag' | 'versicherung' | 'standard';

interface ChainRisk {
  level: 'hoch' | 'mittel' | 'niedrig';
  label: string;
  reason: string;
}

export interface DocumentChain {
  chainType: ChainType;
  title: string;
  previousStep: string;
  currentStep: string;
  nextStep: string;
  risk: ChainRisk;
  daysUntilDeadline: number | null;
}

const CHAIN_LABELS: Record<ChainType, string> = {
  bussgeld:   'Bußgeld → Reaktion → Zahlung',
  forderung:  'Rechnung → Mahnung → Zahlung / Inkasso',
  garantie:   'Kaufbeleg → Garantie → Service',
  rechnung:   'Rechnung → Zahlung → Steuerablage',
  vertrag:    'Vertrag → Frist → Verlängerung / Kündigung',
  versicherung: 'Versicherung → Rückfrage → Nachweis',
  standard:   'Dokument → Aktion → Archiv',
};

function inferChainType(dok: Dokument): ChainType {
  if (!dok) return 'standard';
  const haystack = [dok.typ, dok.titel, dok.zusammenfassung].filter(Boolean).join(' ').toLowerCase();
  if (dok.typ === 'Bußgeld') return 'bussgeld';
  if (dok.typ === 'Mahnung') return 'forderung';
  if (/garantie|gewährleistung|kaufbeleg|kassenbon|bestellung/.test(haystack)) return 'garantie';
  if (dok.typ === 'Rechnung') return 'rechnung';
  if (dok.typ === 'Vertrag') return 'vertrag';
  if (dok.typ === 'Versicherung') return 'versicherung';
  return 'standard';
}

function getDaysUntil(dateString: string | null | undefined): number | null {
  if (!dateString) return null;
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function buildRisk(chainType: ChainType, dok: Dokument, daysUntilDeadline: number | null): ChainRisk {
  if ((dok as any).workflowStatus === 'bezahlt') {
    return { level: 'niedrig', label: 'Niedrig', reason: 'Der wichtigste Schritt wurde bereits abgeschlossen.' };
  }
  if (chainType === 'bussgeld' || chainType === 'forderung') {
    if (daysUntilDeadline != null && daysUntilDeadline <= 0)
      return { level: 'hoch', label: 'Hoch', reason: 'Die Frist ist erreicht oder bereits überschritten.' };
    if (daysUntilDeadline != null && daysUntilDeadline <= 7)
      return { level: 'mittel', label: 'Mittel', reason: 'Die Frist nähert sich und sollte zeitnah abgesichert werden.' };
    return { level: 'mittel', label: 'Mittel', reason: 'Ohne Reaktion ist der nächste Eskalationsschritt wahrscheinlich.' };
  }
  if (chainType === 'rechnung') {
    if (daysUntilDeadline != null && daysUntilDeadline <= 0)
      return { level: 'mittel', label: 'Mittel', reason: 'Die Zahlung sollte jetzt abgeschlossen werden.' };
    if ((dok as any).archiveBehavior === 'moveTo:Steuer')
      return { level: 'niedrig', label: 'Niedrig', reason: 'Das Dokument ist bereits für die Ablage vorbereitet.' };
  }
  if (chainType === 'garantie') {
    return { level: 'niedrig', label: 'Niedrig', reason: 'Kaufbeleg sicher aufbewahren.' };
  }
  if (chainType === 'vertrag') {
    if (daysUntilDeadline != null && daysUntilDeadline <= 30)
      return { level: 'mittel', label: 'Mittel', reason: 'Vertragsfrist bald erreicht — Verlängerung oder Kündigung prüfen.' };
    return { level: 'niedrig', label: 'Niedrig', reason: 'Vertrag aktiv — Fristen beobachten.' };
  }
  return { level: 'niedrig', label: 'Niedrig', reason: 'Kein sofortiger Handlungsbedarf.' };
}

function resolveNextStep(
  chainType: ChainType,
  dok: Dokument,
  digitalTwin: any,
  daysUntilDeadline: number | null,
): string {
  const aiNext = digitalTwin?.intelligence?.lifecycle?.nextAction;
  if (aiNext) return aiNext;

  if (chainType === 'bussgeld') {
    if (daysUntilDeadline != null && daysUntilDeadline <= 14) return 'Einspruch einlegen oder zahlen';
    return 'Frist beobachten';
  }
  if (chainType === 'forderung') return 'Zahlung leisten oder Widerspruch einlegen';
  if (chainType === 'rechnung')  return dok.erledigt ? 'Für Steuer ablegen' : 'Zahlung durchführen';
  if (chainType === 'garantie')  return 'Kaufbeleg aufbewahren';
  if (chainType === 'vertrag')   return 'Fristen prüfen';
  return 'Dokument prüfen und archivieren';
}

export function buildDocumentChain(dok: Dokument | undefined, digitalTwin: any): DocumentChain | null {
  if (!dok) return null;

  const chainType = inferChainType(dok);
  const history = (dok as any).actionHistory || [];
  const lastAction = history[0] || null;
  const daysUntilDeadline = getDaysUntil(dok.frist || (dok as any).garantieBis);
  const previousStep = lastAction?.timeline || (dok.gelesen ? 'Dokument geöffnet' : 'Dokument eingegangen');
  const currentStep = (dok as any).workflowTimeline
    || digitalTwin?.statusSummary
    || digitalTwin?.intelligence?.lifecycle?.phaseLabel
    || 'Wird analysiert';
  const nextStep = resolveNextStep(chainType, dok, digitalTwin, daysUntilDeadline);
  const risk = buildRisk(chainType, dok, daysUntilDeadline);

  return { chainType, title: CHAIN_LABELS[chainType], previousStep, currentStep, nextStep, risk, daysUntilDeadline };
}
