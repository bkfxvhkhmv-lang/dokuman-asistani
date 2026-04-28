/**
 * OutcomePredictor — Belgenin olası sonuçlarını tahmin eder.
 * "Bu belge büyük ihtimalle bir ödeme ile sonuçlanır."
 */
import { InstitutionBehaviorModel } from './InstitutionBehaviorModel';
import { detectIntent } from './IntentDetector';

export interface PredictedOutcome {
  id:          string;
  outcome:     string;
  probability: number;    // 0–1
  emoji:       string;
  timeframe:   string | null;  // "7 gün içinde" vb.
  advice:      string;
}

export interface OutcomePrediction {
  outcomes:   PredictedOutcome[];
  topOutcome: PredictedOutcome;
  summary:    string;
}

// ── Sonuç şablonları ─────────────────────────────────────────────────────────

const OUTCOME_TEMPLATES: Record<string, Omit<PredictedOutcome, 'probability'>> = {
  payment: {
    id: 'payment', outcome: 'Zahlung erforderlich', emoji: '💶',
    timeframe: null,
    advice: 'Bitte zahlen Sie rechtzeitig bis zur Frist oder prüfen Sie Ihr Widerspruchsrecht.',
  },
  appeal: {
    id: 'appeal', outcome: 'Einspruch / Widerspruchsverfahren', emoji: '✍️',
    timeframe: '1–4 Wochen',
    advice: 'Erstellen Sie einen Widerspruchsentwurf und senden Sie ihn an die zuständige Stelle.',
  },
  appointment: {
    id: 'appointment', outcome: 'Termin / persönliches Erscheinen', emoji: '📅',
    timeframe: 'Angegebenes Datum',
    advice: 'Tragen Sie den Termin im Kalender ein und bereiten Sie die nötigen Unterlagen vor.',
  },
  document_needed: {
    id: 'document_needed', outcome: 'Unterlagen einreichen', emoji: '📎',
    timeframe: 'Bis zur Frist',
    advice: 'Scannen Sie die angeforderten Dokumente und senden Sie diese an die Behörde.',
  },
  no_action: {
    id: 'no_action', outcome: 'Kein Handlungsbedarf', emoji: '✅',
    timeframe: null,
    advice: 'Dieses Schreiben ist rein informativ. Sie können es archivieren.',
  },
  legal: {
    id: 'legal', outcome: 'Rechtliches Verfahren möglich', emoji: '⚖️',
    timeframe: '2–6 Wochen',
    advice: 'Wenden Sie sich an einen Rechtsanwalt oder eine Beratungsstelle.',
  },
  contract_sign: {
    id: 'contract_sign', outcome: 'Unterschrift / Zustimmung erforderlich', emoji: '📝',
    timeframe: 'So bald wie möglich',
    advice: 'Lesen Sie den Vertrag sorgfältig durch und holen Sie bei Bedarf fachkundigen Rat.',
  },
};

// ── Olasılık hesabı ───────────────────────────────────────────────────────────

function scoreOutcomes(dok: Record<string, any>): Map<string, number> {
  const scores = new Map<string, number>();
  const intent = detectIntent(dok);
  const text = [dok.rohText, dok.zusammenfassung, dok.titel].filter(Boolean).join('\n').toLowerCase();

  const add = (key: string, v: number) => scores.set(key, (scores.get(key) ?? 0) + v);

  // Intent → sonuç eşleştirme
  if (intent.primary === 'payment')         add('payment', 60);
  if (intent.primary === 'warning')         add('payment', 40);
  if (intent.primary === 'warning')         add('legal', 30);
  if (intent.primary === 'appeal_right')    add('appeal', 55);
  if (intent.primary === 'appointment')     add('appointment', 60);
  if (intent.primary === 'document_upload') add('document_needed', 60);
  if (intent.primary === 'contract')        add('contract_sign', 60);
  if (intent.primary === 'information')     add('no_action', 50);
  if (intent.primary === 'confirmation')    add('no_action', 60);

  // Ek sinyal: tip
  if (dok.typ === 'Mahnung')  { add('payment', 25); add('legal', 20); }
  if (dok.typ === 'Bußgeld')  { add('payment', 30); add('appeal', 20); }
  if (dok.typ === 'Rechnung') { add('payment', 25); }
  if (dok.typ === 'Termin')   { add('appointment', 30); }
  if (dok.typ === 'Vertrag')  { add('contract_sign', 30); }
  if (dok.typ === 'Behörde')  { add('appeal', 15); add('document_needed', 10); }

  // Tutar → ödeme sinyali
  if (dok.betrag && dok.betrag > 0) add('payment', 20);

  // Aktivasyonlar
  if (dok.aktionen?.includes('einspruch')) add('appeal', 20);
  if (dok.aktionen?.includes('zahlen'))    add('payment', 20);
  if (dok.aktionen?.includes('kalender'))  add('appointment', 15);

  // Keyword boost
  if (/vollstreckung|pfändung|gerichtsvollzieher/.test(text)) add('legal', 30);
  if (/bitte\s+unterschreiben|zu\s+unterzeichnen/.test(text)) add('contract_sign', 25);
  if (/keine\s+weiteren\s+(schritte|maßnahmen)/.test(text))   add('no_action', 25);

  return scores;
}

// ── Ana sınıf ─────────────────────────────────────────────────────────────────

export class OutcomePredictor {

  static async predict(dok: Record<string, any>): Promise<OutcomePrediction> {
    const scores = scoreOutcomes(dok);

    // Kurumdan öğrenilen bilgiyle olasılıkları güçlendir
    if (dok.absender) {
      const sug = await InstitutionBehaviorModel.getSuggestion(dok.absender).catch(() => null);
      if (sug?.likelyActions) {
        if (sug.likelyActions.includes('zahlen'))    scores.set('payment', (scores.get('payment') ?? 0) + 15);
        if (sug.likelyActions.includes('einspruch')) scores.set('appeal',  (scores.get('appeal')  ?? 0) + 15);
        if (sug.likelyActions.includes('kalender'))  scores.set('appointment', (scores.get('appointment') ?? 0) + 10);
      }
    }

    if (scores.size === 0) scores.set('no_action', 50);

    const total = [...scores.values()].reduce((a, b) => a + b, 0);
    const sorted = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    // Frist als Timeframe einsetzen
    const fristText = dok.frist
      ? `In ${Math.max(0, Math.ceil((new Date(dok.frist).getTime() - Date.now()) / 86_400_000))} Tagen`
      : null;

    const outcomes: PredictedOutcome[] = sorted.map(([key, score]) => {
      const template = OUTCOME_TEMPLATES[key] ?? OUTCOME_TEMPLATES.no_action;
      return {
        ...template,
        probability: Math.round((score / total) * 100) / 100,
        timeframe:   template.timeframe ?? fristText,
      };
    });

    const topOutcome = outcomes[0];
    const summary = `${topOutcome.emoji} ${topOutcome.outcome} — ${Math.round(topOutcome.probability * 100)}% Wahrscheinlichkeit`;

    return { outcomes, topOutcome, summary };
  }
}
