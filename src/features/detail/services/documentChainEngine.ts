import type { Dokument } from '@/store';
import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';

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

function LT(key: string, vars?: Record<string, string | number>) {
  return t(getLangSync(), key, vars);
}

function getChainLabel(chainType: ChainType): string {
  return LT(`chain.title.${chainType}`);
}

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
    return { level: 'niedrig', label: LT('risk.level.short.niedrig'), reason: LT('chain.reason.done') };
  }
  if (chainType === 'bussgeld' || chainType === 'forderung') {
    if (daysUntilDeadline != null && daysUntilDeadline <= 0)
      return { level: 'hoch', label: LT('risk.level.short.hoch'), reason: LT('chain.reason.deadline_overdue') };
    if (daysUntilDeadline != null && daysUntilDeadline <= 7)
      return { level: 'mittel', label: LT('risk.level.short.mittel'), reason: LT('chain.reason.deadline_soon') };
    return { level: 'mittel', label: LT('risk.level.short.mittel'), reason: LT('chain.reason.escalation') };
  }
  if (chainType === 'rechnung') {
    if (daysUntilDeadline != null && daysUntilDeadline <= 0)
      return { level: 'mittel', label: LT('risk.level.short.mittel'), reason: LT('chain.reason.payment_due') };
    if ((dok as any).archiveBehavior === 'moveTo:Steuer')
      return { level: 'niedrig', label: LT('risk.level.short.niedrig'), reason: LT('chain.reason.archive_ready') };
  }
  if (chainType === 'garantie') {
    return { level: 'niedrig', label: LT('risk.level.short.niedrig'), reason: LT('chain.reason.keep_receipt') };
  }
  if (chainType === 'vertrag') {
    if (daysUntilDeadline != null && daysUntilDeadline <= 30)
      return { level: 'mittel', label: LT('risk.level.short.mittel'), reason: LT('chain.reason.contract_soon') };
    return { level: 'niedrig', label: LT('risk.level.short.niedrig'), reason: LT('chain.reason.contract_watch') };
  }
  return { level: 'niedrig', label: LT('risk.level.short.niedrig'), reason: LT('chain.reason.no_action') };
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
    if (daysUntilDeadline != null && daysUntilDeadline <= 14) return LT('chain.next.bussgeld');
    return LT('chain.next.watch_deadline');
  }
  if (chainType === 'forderung') return LT('chain.next.forderung');
  if (chainType === 'rechnung')  return dok.erledigt ? LT('chain.next.tax_archive') : LT('chain.next.pay');
  if (chainType === 'garantie')  return LT('chain.next.keep_receipt');
  if (chainType === 'vertrag')   return LT('chain.next.check_deadlines');
  return LT('chain.next.review_archive');
}

export function buildDocumentChain(dok: Dokument | undefined, digitalTwin: any): DocumentChain | null {
  if (!dok) return null;

  const chainType = inferChainType(dok);
  const history = (dok as any).actionHistory || [];
  const lastAction = history[0] || null;
  const daysUntilDeadline = getDaysUntil(dok.frist || (dok as any).garantieBis);
  const previousStep = lastAction?.timeline || (dok.gelesen ? LT('chain.prev.opened') : LT('chain.prev.received'));
  const currentStep = (dok as any).workflowTimeline
    || digitalTwin?.statusSummary
    || digitalTwin?.intelligence?.lifecycle?.phaseLabel
    || LT('chain.current.analysing');
  const nextStep = resolveNextStep(chainType, dok, digitalTwin, daysUntilDeadline);
  const risk = buildRisk(chainType, dok, daysUntilDeadline);

  return { chainType, title: getChainLabel(chainType), previousStep, currentStep, nextStep, risk, daysUntilDeadline };
}
