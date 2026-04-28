import { formatBetrag } from '../utils';
import type { BudgetTarget, Dokument } from '../store';

// ── Analysis result ────────────────────────────────────────────────────────

export type TargetStatus = 'ok' | 'warnung' | 'kritisch';

export interface TargetAnalysis {
  target:         BudgetTarget;
  spent:          number;        // actual this month
  projected:      number;        // extrapolated to month end
  pct:            number;        // spent / limit  (0–1+)
  projectedPct:   number;        // projected / limit
  status:         TargetStatus;
  velocityPerDay: number;        // €/day at current pace
  daysElapsed:    number;
  daysRemaining:  number;
  overBudgetBy:   number | null; // > 0 when projected > limit
  // human-readable strings
  velocityStr:    string;        // "€12/Tag · Prognose: €450"
  statusLabel:    string;        // "Im Rahmen" / "Achtung" / "Über Budget"
}

// ── Color scale ────────────────────────────────────────────────────────────

export const TARGET_STATUS_COLOR: Record<TargetStatus, string> = {
  ok:        '#1D9E75',
  warnung:   '#FFB703',
  kritisch:  '#EE6055',
};

// ── Core calculation ───────────────────────────────────────────────────────

export function analyzeTarget(target: BudgetTarget, spentThisMonth: number): TargetAnalysis {
  const now            = new Date();
  const daysElapsed    = Math.max(now.getDate(), 1);
  const daysInMonth    = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining  = daysInMonth - daysElapsed;

  const velocityPerDay = spentThisMonth / daysElapsed;
  const projected      = velocityPerDay * daysInMonth;
  const pct            = target.limitBetrag > 0 ? spentThisMonth / target.limitBetrag : 0;
  const projectedPct   = target.limitBetrag > 0 ? projected / target.limitBetrag : 0;

  const status: TargetStatus =
    projectedPct >= 1.0  ? 'kritisch' :
    projectedPct >= 0.85 ? 'warnung'  : 'ok';

  const overBudgetBy = projected > target.limitBetrag
    ? projected - target.limitBetrag
    : null;

  const velocityStr = [
    `${formatBetrag(velocityPerDay) ?? '–'}/Tag`,
    `Prognose: ${formatBetrag(projected) ?? '–'}`,
  ].join(' · ');

  const statusLabel =
    status === 'kritisch' ? 'Über Budget' :
    status === 'warnung'  ? 'Achtung'     : 'Im Rahmen';

  return {
    target, spent: spentThisMonth, projected, pct, projectedPct,
    status, velocityPerDay, daysElapsed, daysRemaining, overBudgetBy,
    velocityStr, statusLabel,
  };
}

// ── Build all analyses for a set of docs ──────────────────────────────────

export function analyzeAllTargets(
  targets: BudgetTarget[],
  docs:    Dokument[],
): TargetAnalysis[] {
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const payDocs    = docs.filter(d => d.betrag && (d.betrag as number) > 0);

  return targets.map(t => {
    const thisMonthDocs = payDocs.filter(d => new Date(d.datum) >= monthStart);
    const spent = t.id === 'gesamt'
      ? thisMonthDocs.reduce((s, d) => s + ((d.betrag as number) || 0), 0)
      : thisMonthDocs.filter(d => d.typ === t.id)
                     .reduce((s, d) => s + ((d.betrag as number) || 0), 0);
    return analyzeTarget(t, spent);
  });
}

// ── Pick the "most critical" analysis to surface on the home screen ────────

export function getMostCriticalTarget(analyses: TargetAnalysis[]): TargetAnalysis | null {
  if (analyses.length === 0) return null;
  const order: TargetStatus[] = ['kritisch', 'warnung', 'ok'];
  for (const status of order) {
    const found = analyses.find(a => a.status === status);
    if (found) return found;
  }
  return analyses[0];
}
