/**
 * LifecyclePrediction
 * Bir belgenin "nerede olduğunu" ve "nereye gideceğini" tahmin eder.
 *
 * InstitutionBehaviorModel + RuleEngine verisini kombine eder.
 * Çıktı: phase, nextAction, predictedFristDate, confidence.
 */
import { InstitutionBehaviorModel, type InstitutionSuggestion } from '@/core/intelligence/InstitutionBehaviorModel';
import { RuleEngineV4 } from '@/core/rules/RuleEngineV4';

// ── Tipler ────────────────────────────────────────────────────────────────────

export type LifecyclePhase =
  | 'received'       // Geldi, henüz incelenmedi
  | 'reviewing'      // İnceleniyor
  | 'action_needed'  // Aksiyon gerekiyor
  | 'waiting'        // Cevap bekleniyor (Einspruch yapıldı vb.)
  | 'resolved'       // Tamamlandı / erledigt
  | 'overdue';       // Frist geçti

export interface LifecyclePrediction {
  phase:              LifecyclePhase;
  phaseLabel:         string;
  phaseIcon:          string;
  nextAction:         string | null;
  nextActionEmoji:    string | null;
  predictedFristDays: number | null;      // tahmini frist (gün), belge fristinden farklı olabilir
  predictedBetrag:    number | null;
  urgencyScore:       number;             // 0-100
  confidence:         'high' | 'medium' | 'low';
  reasoning:          string[];           // tahmin gerekçeleri
}

// ── Sabitler ──────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<LifecyclePhase, string> = {
  received:      'Eingegangen',
  reviewing:     'In Prüfung',
  action_needed: 'Handlung nötig',
  waiting:       'Warte auf Antwort',
  resolved:      'Erledigt',
  overdue:       'Frist überschritten',
};

const PHASE_ICONS: Record<LifecyclePhase, string> = {
  received:      '📬',
  reviewing:     '👁',
  action_needed: '⚡',
  waiting:       '⏳',
  resolved:      '✅',
  overdue:       '🔴',
};

const NEXT_ACTION_MAP: Partial<Record<string, { action: string; emoji: string }>> = {
  zahlen:    { action: 'Zahlung erforderlich',     emoji: '💶' },
  einspruch: { action: 'Einspruch prüfen',         emoji: '✍️' },
  kalender:  { action: 'In Kalender eintragen',   emoji: '📅' },
  mail:      { action: 'E-Mail-Entwurf öffnen',     emoji: '📧' },
};

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function daysUntilFrist(dok: Record<string, any>): number | null {
  if (!dok.frist) return null;
  return Math.ceil((new Date(dok.frist).getTime() - Date.now()) / 86_400_000);
}

function determinePhase(dok: Record<string, any>, daysLeft: number | null): LifecyclePhase {
  if (dok.erledigt) return 'resolved';
  if (daysLeft !== null && daysLeft < 0) return 'overdue';
  if (dok.risiko === 'hoch') return 'action_needed';
  if (!dok.gelesen) return 'received';
  if (daysLeft !== null && daysLeft <= 7) return 'action_needed';
  return 'reviewing';
}

// ── Ana sınıf ─────────────────────────────────────────────────────────────────

export class LifecyclePredictionEngine {

  static async predict(dok: Record<string, any>): Promise<LifecyclePrediction> {
    const reasoning: string[] = [];

    // RuleEngine aciliyet skoru
    const urgency = RuleEngineV4.urgencyScore(dok);

    // Kurumdan öğrenilmiş profil
    let suggestion: InstitutionSuggestion | null = null;
    if (dok.absender) {
      suggestion = await InstitutionBehaviorModel.getSuggestion(dok.absender);
    }

    // Frist hesaplama
    let predictedFristDays: number | null = daysUntilFrist(dok);

    // Belge kendi fristine sahip değilse → kurumdan tahmin
    if (predictedFristDays === null && suggestion?.avgFristText) {
      const learned = parseInt(suggestion.avgFristText);
      if (!isNaN(learned)) {
        predictedFristDays = learned;
        reasoning.push(`Gelernte Ø-Frist für ${dok.absender}: ${learned} Tage`);
      }
    }

    // Tahmini tutar (kurumdan)
    let predictedBetrag: number | null = dok.betrag ?? null;
    if (!predictedBetrag && suggestion?.avgBetragText) {
      const learned = parseFloat(suggestion.avgBetragText);
      if (!isNaN(learned)) {
        predictedBetrag = learned;
        reasoning.push(`Gelernte Ø-Betrag: ${suggestion.avgBetragText}`);
      }
    }

    // Faz belirleme
    const daysLeft = daysUntilFrist(dok);
    const phase = determinePhase(dok, daysLeft);

    if (phase === 'overdue') reasoning.push('Frist abgelaufen — schnelle Rückmeldung nötig');
    if (phase === 'action_needed') reasoning.push('Hohes Risiko oder kurze Frist');
    if (dok.erledigt) reasoning.push('Vom Nutzer als erledigt markiert');

    // Sonraki aksiyon
    const aktionen: string[] = dok.aktionen ?? suggestion?.likelyActions ?? [];
    const primaryAction = aktionen[0] ?? null;
    const actionInfo = primaryAction ? NEXT_ACTION_MAP[primaryAction] ?? null : null;

    // Güven seviyesi
    let confidence: LifecyclePrediction['confidence'] = 'low';
    if (suggestion && suggestion.totalDocs >= 5) confidence = 'high';
    else if (suggestion && suggestion.totalDocs >= 2) confidence = 'medium';
    else if (dok.frist && dok.risiko) confidence = 'medium';

    // Risk açıklaması
    if (dok.risiko === 'hoch')   reasoning.push('Regelmotor: hohes Risiko');
    if (dok.typ === 'Mahnung')   reasoning.push('Mahnung → ödeme veya itiraz gerekebilir');
    if (dok.typ === 'Bußgeld')   reasoning.push('Bußgeld → genellikle ödeme veya Einspruch');

    return {
      phase,
      phaseLabel:         PHASE_LABELS[phase],
      phaseIcon:          PHASE_ICONS[phase],
      nextAction:         actionInfo?.action ?? null,
      nextActionEmoji:    actionInfo?.emoji  ?? null,
      predictedFristDays,
      predictedBetrag,
      urgencyScore: urgency,
      confidence,
      reasoning,
    };
  }

  // ── Batch: birden fazla belge için sırala ─────────────────────────────────────

  static async prioritize(
    docs: Record<string, any>[],
  ): Promise<Array<{ doc: Record<string, any>; prediction: LifecyclePrediction }>> {
    const results = await Promise.all(
      docs.map(async doc => ({ doc, prediction: await this.predict(doc) })),
    );
    return results.sort((a, b) => b.prediction.urgencyScore - a.prediction.urgencyScore);
  }

  // ── Özet metin: "Bu belge ne durumda?" ───────────────────────────────────────

  static async summarize(dok: Record<string, any>): Promise<string> {
    const p = await this.predict(dok);
    const parts = [`${p.phaseIcon} ${p.phaseLabel}`];
    if (p.nextAction) parts.push(`→ ${p.nextAction}`);
    if (p.predictedFristDays !== null) {
      if (p.predictedFristDays < 0) parts.push('⚠️ Frist abgelaufen');
      else if (p.predictedFristDays === 0) parts.push('⚠️ Heute fällig');
      else parts.push(`${p.predictedFristDays} Tage verbleibend`);
    }
    return parts.join(' · ');
  }
}
