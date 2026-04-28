import { getTageVerbleibend, formatBetrag } from '../utils';
import type { Dokument } from '../store';

// ── Types ──────────────────────────────────────────────────────────────────

export type HotPriority = 'kritisch' | 'warnung' | 'info';
export type HotReason   = 'frist' | 'anomalie' | 'neu';
export type HotAction   = 'bezahlen' | 'pruefen' | 'ansehen';

export interface HotDoc {
  dok:       Dokument;
  reason:    HotReason;
  priority:  HotPriority;
  emoji:     string;
  label:     string;   // short reason shown on card
  sublabel:  string;   // e.g. "Heute fällig · €89"
  action:    HotAction;
  actionLabel: string;
}

// ── Priority order (lower = shown first) ──────────────────────────────────

const PRIORITY_RANK: Record<HotPriority, number> = {
  kritisch: 0,
  warnung:  1,
  info:     2,
};

// ── Rule: deadline today / tomorrow ───────────────────────────────────────

function buildFristHot(d: Dokument): HotDoc | null {
  if (d.erledigt || !d.frist) return null;
  const tage = getTageVerbleibend(d.frist);
  if (tage === null || tage > 1) return null;

  const dayStr  = tage < 0 ? 'Überfällig' : tage === 0 ? 'Heute' : 'Morgen';
  const betragStr = d.betrag ? ` · ${formatBetrag(d.betrag as number) ?? ''}` : '';

  return {
    dok:        d,
    reason:     'frist',
    priority:   tage <= 0 ? 'kritisch' : 'warnung',
    emoji:      tage <= 0 ? '🚨' : '⏰',
    label:      `${dayStr} fällig`,
    sublabel:   `${d.absender}${betragStr}`,
    action:     d.betrag ? 'bezahlen' : 'ansehen',
    actionLabel: d.betrag ? 'Jetzt zahlen' : 'Ansehen',
  };
}

// ── Rule: amount anomaly (>15% above sender average) ──────────────────────

function buildAnomalieHot(d: Dokument, avgBySender: Record<string, number>): HotDoc | null {
  if (d.erledigt || !d.betrag || (d.betrag as number) <= 0) return null;
  const avg = avgBySender[d.absender];
  if (!avg || avg <= 0) return null;
  const pct = ((d.betrag as number) - avg) / avg;
  if (pct < 0.15) return null;

  return {
    dok:         d,
    reason:      'anomalie',
    priority:    pct >= 0.40 ? 'kritisch' : 'warnung',
    emoji:       '📈',
    label:       `${Math.round(pct * 100)}% über Durchschnitt`,
    sublabel:    `${d.absender} · Ø ${formatBetrag(avg) ?? '–'} → ${formatBetrag(d.betrag as number) ?? '–'}`,
    action:      'pruefen',
    actionLabel: 'Prüfen',
  };
}

// ── Rule: new doc (last 6 hours) ──────────────────────────────────────────

function buildNeuHot(d: Dokument): HotDoc | null {
  if (d.erledigt) return null;
  const age = Date.now() - new Date(d.datum).getTime();
  if (age > 6 * 60 * 60 * 1000) return null; // > 6 hours old

  return {
    dok:         d,
    reason:      'neu',
    priority:    'info',
    emoji:       '✨',
    label:       'Neu analysiert',
    sublabel:    `${d.typ} · ${d.absender}`,
    action:      'ansehen',
    actionLabel: 'Ansehen',
  };
}

// ── Main builder ──────────────────────────────────────────────────────────

export function buildHotDocs(docs: Dokument[], maxCount = 5): HotDoc[] {
  // Pre-compute per-sender average betrag for anomaly detection
  const sumBySender:   Record<string, number> = {};
  const countBySender: Record<string, number> = {};
  for (const d of docs) {
    if (!d.betrag || (d.betrag as number) <= 0) continue;
    sumBySender[d.absender]   = (sumBySender[d.absender]   || 0) + (d.betrag as number);
    countBySender[d.absender] = (countBySender[d.absender] || 0) + 1;
  }
  const avgBySender: Record<string, number> = {};
  for (const key of Object.keys(sumBySender)) {
    if (countBySender[key] >= 2) {
      avgBySender[key] = sumBySender[key] / countBySender[key];
    }
  }

  const seen = new Set<string>();
  const hits: HotDoc[] = [];

  for (const d of docs) {
    if (seen.has(d.id)) continue;

    const hot =
      buildFristHot(d) ??
      buildAnomalieHot(d, avgBySender) ??
      buildNeuHot(d);

    if (hot) {
      hits.push(hot);
      seen.add(d.id);
    }
  }

  // Sort by priority then by deadline
  return hits
    .sort((a, b) => {
      const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (pr !== 0) return pr;
      const ta = getTageVerbleibend(a.dok.frist) ?? 999;
      const tb = getTageVerbleibend(b.dok.frist) ?? 999;
      return ta - tb;
    })
    .slice(0, maxCount);
}

// ── Priority → accent colour ──────────────────────────────────────────────

export const PRIORITY_COLOR: Record<HotPriority, string> = {
  kritisch: '#EE6055',
  warnung:  '#FFB703',
  info:     '#4361EE',
};
