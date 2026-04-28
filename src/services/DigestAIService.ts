/**
 * DigestAIService — Home screen "Executive Summary" generator
 *
 * Strategy:
 *   1. Build a local, rule-based digest instantly from existing signals.
 *   2. Concurrently attempt an AI upgrade via the backend chat endpoint
 *      (uses the top-priority document as anchor, injects portfolio context).
 *   3. Return whichever is ready first within the timeout window.
 *      If AI succeeds within 4s → source:'ai'.  Otherwise → source:'local'.
 */

import { chatWithDocument } from './v4Api';
import { isOnline } from './offlineQueue';
import { getTageVerbleibend, formatBetrag } from '../utils';
import type { Dokument } from '../store';
import type { HotDoc } from './PriorityService';
import type { BudgetSnapshot } from './BudgetEngine';
import type { TargetAnalysis } from './TargetService';

// ── Return type ────────────────────────────────────────────────────────────

export interface DigestResult {
  text:     string;
  source:   'local' | 'ai';
  severity: 'ok' | 'warnung' | 'kritisch';
  icon:     string;
}

// ── Local digest builder ───────────────────────────────────────────────────

function buildLocalDigest(
  docs:    Dokument[],
  hot:     HotDoc[],
  budget:  BudgetSnapshot,
  targets: TargetAnalysis[],
): DigestResult {
  const topTarget  = targets.find(t => t.status === 'kritisch') ?? targets.find(t => t.status === 'warnung');
  const topHot     = hot[0];
  const anomaly    = budget.insights.find(i => i.type === 'anomalie');
  const prediction = budget.insights.find(i => i.type === 'vorhersage');

  // Build ordered signal list (most critical first)
  const signals: { text: string; severity: 'ok' | 'warnung' | 'kritisch' }[] = [];

  if (topHot?.priority === 'kritisch') {
    signals.push({ severity: 'kritisch', text: `${topHot.label}: ${topHot.sublabel}` });
  } else if (topHot?.priority === 'warnung') {
    signals.push({ severity: 'warnung', text: `${topHot.label}: ${topHot.sublabel}` });
  }

  if (topTarget?.status === 'kritisch') {
    signals.push({ severity: 'kritisch',
      text: `Monatsbudget bei ${Math.round(topTarget.pct * 100)}% — ${formatBetrag(topTarget.spent) ?? '–'} von ${formatBetrag(topTarget.target.limitBetrag) ?? '–'}` });
  } else if (topTarget?.status === 'warnung') {
    signals.push({ severity: 'warnung',
      text: `Budget-Prognose ${Math.round(topTarget.projectedPct * 100)}% — ${topTarget.velocityStr}` });
  }

  if (anomaly) {
    signals.push({ severity: 'warnung', text: anomaly.text });
  } else if (prediction) {
    signals.push({ severity: 'warnung', text: prediction.text });
  }

  if (signals.length === 0) {
    const offenCount = docs.filter(d => !d.erledigt).length;
    return {
      text:     offenCount > 0
        ? `${offenCount} offene Dokumente — alle im Zeitplan`
        : 'Alles erledigt — hervorragende Arbeit!',
      source:   'local',
      severity: 'ok',
      icon:     '✅',
    };
  }

  const top      = signals[0];
  const extras   = signals.length - 1;
  const fullText = extras > 0 ? `${top.text} · +${extras} weitere` : top.text;

  return {
    text:     fullText,
    source:   'local',
    severity: top.severity,
    icon:     top.severity === 'kritisch' ? '🚨' : top.severity === 'warnung' ? '⚠️' : '✅',
  };
}

// ── AI context message ─────────────────────────────────────────────────────

function buildAIContextMessage(
  lead:    Dokument,
  hot:     HotDoc[],
  budget:  BudgetSnapshot,
  targets: TargetAnalysis[],
): string {
  const urgentList = hot.slice(0, 3).map(h => `• ${h.sublabel} (${h.label})`).join('\n');
  const budgetLine = targets[0]
    ? `Monatsbudget: ${formatBetrag(targets[0].spent) ?? '–'} von ${formatBetrag(targets[0].target.limitBetrag) ?? '–'} (${targets[0].statusLabel})`
    : `Offene Gesamtsumme: ${formatBetrag(budget.totalOpen) ?? '–'}`;
  const anomalyLine = budget.insights[0]?.text ?? '';

  return [
    `Portfolio-Status (${new Date().toLocaleDateString('de-DE')}):`,
    urgentList || '• Keine dringenden Dokumente',
    budgetLine,
    anomalyLine,
    '',
    'Fasse den wichtigsten Handlungsbedarf in einem prägnanten deutschen Satz (max. 15 Wörter) zusammen.',
  ].filter(Boolean).join('\n');
}

// ── Main export ────────────────────────────────────────────────────────────

const AI_TIMEOUT_MS = 4000;

export async function generateDigest(
  docs:    Dokument[],
  hot:     HotDoc[],
  budget:  BudgetSnapshot,
  targets: TargetAnalysis[],
): Promise<DigestResult> {
  const local = buildLocalDigest(docs, hot, budget, targets);

  // Skip AI if offline, no docs, or nothing urgent
  const topDoc = hot[0]?.dok ?? docs.filter(d => !d.erledigt)[0];
  if (!topDoc || !(await isOnline())) return local;

  try {
    const contextMsg = buildAIContextMessage(topDoc, hot, budget, targets);

    const aiPromise = chatWithDocument(
      topDoc.id,
      [{ role: 'user', content: contextMsg }],
      'de',
    ) as Promise<any>;

    const timeoutPromise = new Promise<null>(res => setTimeout(() => res(null), AI_TIMEOUT_MS));

    const result = await Promise.race([aiPromise, timeoutPromise]);
    if (!result) return local;

    // Extract text from response (shape: { message: string } or { reply: string } or last message content)
    const rawText: string =
      result?.message ?? result?.reply ?? result?.content ??
      result?.messages?.[result?.messages?.length - 1]?.content ?? '';

    if (!rawText || rawText.length < 8) return local;

    // Trim to max 100 chars
    const aiText = rawText.trim().replace(/\n+/g, ' ').slice(0, 120);
    return { ...local, text: aiText, source: 'ai' };
  } catch {
    return local;
  }
}
