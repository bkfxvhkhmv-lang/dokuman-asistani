import { getTageVerbleibend, formatBetrag } from '../utils';
import type { Dokument } from '../store';

export interface MonthlyBucket {
  month: string;  // "2026-03"
  label: string;  // "Mär"
  total: number;
}

export interface RecurringBill {
  absender:     string;
  avgBetrag:    number;
  frequency:    'monatlich' | 'quartalsweise' | 'jährlich';
  nextExpected: string | null; // ISO
}

export interface BudgetInsight {
  type:     'anomalie' | 'vorhersage' | 'tipp';
  text:     string;
  severity: 'hoch' | 'mittel' | 'info';
}

export interface BudgetSnapshot {
  totalOpen:         number;
  thisMonthTotal:    number;
  unpaidCount:       number;
  paidThisMonth:     number;
  monthlyBuckets:    MonthlyBucket[];
  nextMonthEstimate: number;
  recurringBills:    RecurringBill[];
  insights:          BudgetInsight[];
}

const MONTH_LABELS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function detectRecurring(docs: Dokument[]): RecurringBill[] {
  const byAbsender: Record<string, Dokument[]> = {};
  for (const d of docs) {
    if (!d.betrag || (d.betrag as number) <= 0) continue;
    const key = d.absender || 'Unbekannt';
    (byAbsender[key] ??= []).push(d);
  }

  const result: RecurringBill[] = [];
  for (const [absender, ds] of Object.entries(byAbsender)) {
    if (ds.length < 2) continue;
    const sorted = [...ds].sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime());

    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push((new Date(sorted[i].datum).getTime() - new Date(sorted[i-1].datum).getTime()) / 86_400_000);
    }
    const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;

    const frequency: RecurringBill['frequency'] =
      avgInterval < 45 ? 'monatlich' :
      avgInterval < 120 ? 'quartalsweise' : 'jährlich';

    const avgBetrag = ds.reduce((s, d) => s + ((d.betrag as number) || 0), 0) / ds.length;

    const lastDate = new Date(sorted[sorted.length - 1].datum);
    lastDate.setDate(lastDate.getDate() + Math.round(avgInterval));
    const nextExpected = lastDate > new Date() ? lastDate.toISOString() : null;

    result.push({ absender, avgBetrag, frequency, nextExpected });
  }

  return result.sort((a, b) => b.avgBetrag - a.avgBetrag).slice(0, 5);
}

function buildInsights(
  buckets:        MonthlyBucket[],
  recurring:      RecurringBill[],
  thisMonthTotal: number,
): BudgetInsight[] {
  const insights: BudgetInsight[] = [];

  if (buckets.length >= 2) {
    const prev = buckets.slice(0, -1);
    const avg  = prev.reduce((s, b) => s + b.total, 0) / prev.length;
    if (avg > 0) {
      const pct = ((thisMonthTotal - avg) / avg) * 100;
      if (pct >= 20) {
        insights.push({ type: 'anomalie', severity: 'hoch',
          text: `${Math.round(pct)}% mehr als der Ø (${formatBetrag(avg) ?? '–'})` });
      } else if (pct <= -20) {
        insights.push({ type: 'tipp', severity: 'info',
          text: `${Math.abs(Math.round(pct))}% unter dem Ø – gut gemacht!` });
      }
    }
  }

  for (const r of recurring) {
    if (!r.nextExpected) continue;
    const days = getTageVerbleibend(r.nextExpected);
    if (days === null || days < 0 || days > 14) continue;
    insights.push({
      type: 'vorhersage',
      severity: days <= 3 ? 'hoch' : 'mittel',
      text: `${r.absender}: ~${formatBetrag(r.avgBetrag) ?? '–'} ${days === 0 ? 'heute fällig' : `in ${days} Tagen`}`,
    });
    if (insights.length >= 3) break;
  }

  return insights.slice(0, 3);
}

export function buildBudgetSnapshot(docs: Dokument[]): BudgetSnapshot {
  const heute      = new Date(); heute.setHours(0, 0, 0, 0);
  const monthStart = new Date(heute.getFullYear(), heute.getMonth(), 1);

  const payDocs  = docs.filter((d) => d.betrag && (d.betrag as number) > 0);
  const openDocs = payDocs.filter((d) => !d.erledigt);

  const totalOpen      = openDocs.reduce((s, d) => s + ((d.betrag as number) || 0), 0);
  const unpaidCount    = openDocs.length;
  const thisMonthTotal = payDocs
    .filter((d) => new Date(d.datum) >= monthStart)
    .reduce((s, d) => s + ((d.betrag as number) || 0), 0);
  const paidThisMonth  = payDocs
    .filter((d) => d.erledigt && new Date(d.datum) >= monthStart)
    .reduce((s, d) => s + ((d.betrag as number) || 0), 0);

  // last 6 calendar months (including current)
  const monthlyBuckets: MonthlyBucket[] = Array.from({ length: 6 }, (_, i) => {
    const d   = new Date(heute.getFullYear(), heute.getMonth() - (5 - i), 1);
    const key = monthKey(d);
    return {
      month: key,
      label: MONTH_LABELS[d.getMonth()],
      total: payDocs
        .filter((doc) => monthKey(new Date(doc.datum)) === key)
        .reduce((s, d) => s + ((d.betrag as number) || 0), 0),
    };
  });

  const recurringBills     = detectRecurring(docs);
  const nextMonthEstimate  = recurringBills
    .filter((r) => r.frequency === 'monatlich')
    .reduce((s, r) => s + r.avgBetrag, 0);
  const insights           = buildInsights(monthlyBuckets, recurringBills, thisMonthTotal);

  return { totalOpen, thisMonthTotal, unpaidCount, paidThisMonth, monthlyBuckets, nextMonthEstimate, recurringBills, insights };
}
