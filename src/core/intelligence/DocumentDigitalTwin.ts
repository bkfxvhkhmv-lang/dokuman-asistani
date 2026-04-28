/**
 * DocumentDigitalTwin
 * Bir belgenin tüm boyutlarını tek bir yapıda toplar.
 * "Bu belge ne durumda?" sorusunu tek sorguda yanıtlar.
 *
 * Twin = { content, lifecycle, tasks, relations, syncState, ruleResults, intelligence }
 */
import { RuleEngineV4 } from '../rules/RuleEngineV4';
import { LifecyclePredictionEngine, type LifecyclePrediction } from './LifecyclePrediction';
import { InstitutionBehaviorModel, type InstitutionSuggestion } from './InstitutionBehaviorModel';
import type { Dokument, Aufgabe } from '../../store';

// ── Tipler ────────────────────────────────────────────────────────────────────

export interface TwinContent {
  titel:           string;
  absender:        string;
  typ:             string;
  risiko:          string;
  zusammenfassung: string | null;
  betrag:          number | null;
  frist:           string | null;
  datum:           string | null;
  etiketten:       string[];
  rohTextLength:   number;            // metin boyutu (içerik GDPR için saklanmaz)
}

export interface TwinTask {
  id:             string;
  titel:          string;
  frist:          string | null;
  erledigt:       boolean;
  verantwortlich: string | null;
}

export interface TwinSyncState {
  v4DocId:      string | null;
  version:      number;
  isDeleted:    boolean;
  lastSyncAt:   string | null;
  hasConflict:  boolean;
}

export interface TwinRuleResults {
  appliedRules:  string[];
  urgencyScore:  number;
  classify:      'urgent' | 'thisWeek' | 'info';
}

export interface TwinIntelligence {
  lifecycle:           LifecyclePrediction;
  institutionSuggestion: InstitutionSuggestion | null;
  institutionDesc:     string | null;
}

export interface DocumentDigitalTwinModel {
  docId:       string;
  generatedAt: string;
  content:     TwinContent;
  tasks:       TwinTask[];
  syncState:   TwinSyncState;
  ruleResults: TwinRuleResults;
  intelligence: TwinIntelligence;
  healthScore:  number;         // 0-100: belge tamamlık skoru
  statusSummary: string;        // "⚡ Aksiyon Gerekli · 3 Tage verbleibend"
}

// ── Ana sınıf ─────────────────────────────────────────────────────────────────

export class DocumentDigitalTwin {

  static async build(dok: Dokument): Promise<DocumentDigitalTwinModel> {

    // İçerik
    const content: TwinContent = {
      titel:           dok.titel ?? '',
      absender:        dok.absender ?? '',
      typ:             dok.typ ?? 'Sonstiges',
      risiko:          dok.risiko ?? 'niedrig',
      zusammenfassung: dok.zusammenfassung ?? null,
      betrag:          dok.betrag ?? null,
      frist:           dok.frist ?? null,
      datum:           dok.datum ?? null,
      etiketten:       dok.etiketten ?? [],
      rohTextLength:   (dok.rohText ?? '').length,
    };

    // Görevler
    const tasks: TwinTask[] = (dok.aufgaben ?? []).map((a: Aufgabe) => ({
      id:             a.id,
      titel:          a.titel,
      frist:          a.faellig ?? null,
      erledigt:       a.erledigt ?? false,
      verantwortlich: a.verantwortlich ?? null,
    }));

    // Sync durumu
    const syncState: TwinSyncState = {
      v4DocId:     dok.v4DocId ?? null,
      version:     dok.version ?? 1,
      isDeleted:   dok.isDeleted ?? false,
      lastSyncAt:  dok._lastSyncAt ?? null,
      hasConflict: dok._hasConflict ?? false,
    };

    // Kural sonuçları
    const ruled = RuleEngineV4.applyRules(dok);
    const ruleResults: TwinRuleResults = {
      appliedRules: ruled._appliedRules,
      urgencyScore: RuleEngineV4.urgencyScore(dok),
      classify:     RuleEngineV4.classify(dok),
    };

    // Intelligence
    const [lifecycle, institutionSuggestion, institutionDesc] = await Promise.all([
      LifecyclePredictionEngine.predict(dok),
      dok.absender ? InstitutionBehaviorModel.getSuggestion(dok.absender) : Promise.resolve(null),
      dok.absender ? InstitutionBehaviorModel.describeInstitution(dok.absender) : Promise.resolve(null),
    ]);

    const intelligence: TwinIntelligence = {
      lifecycle,
      institutionSuggestion,
      institutionDesc,
    };

    // Sağlık skoru
    const healthScore = this._computeHealth(dok, ruleResults, tasks);

    // Durum özeti
    const statusSummary = await LifecyclePredictionEngine.summarize(dok);

    return {
      docId:       dok.id,
      generatedAt: new Date().toISOString(),
      content,
      tasks,
      syncState,
      ruleResults,
      intelligence,
      healthScore,
      statusSummary,
    };
  }

  // ── Sağlık skoru hesabı ───────────────────────────────────────────────────────

  private static _computeHealth(
    dok: Record<string, any>,
    rules: TwinRuleResults,
    tasks: TwinTask[],
  ): number {
    let score = 40; // taban

    if (dok.titel)           score += 10;
    if (dok.absender)        score += 10;
    if (dok.zusammenfassung) score += 10;
    if (dok.typ && dok.typ !== 'Sonstiges') score += 5;
    if (dok.datum)           score += 5;
    if (dok.frist)           score += 5;
    if (dok.rohText && dok.rohText.length > 50) score += 10;
    if (dok.etiketten?.length) score += 3;
    if (tasks.length)        score += 2;

    // Düşürücü faktörler
    if (dok.risiko === 'hoch' && !dok.erledigt) score -= 5;
    if (rules.urgencyScore > 70) score -= 5;

    const openTasks = tasks.filter(t => !t.erledigt).length;
    if (openTasks > 2) score -= openTasks;

    return Math.max(0, Math.min(100, score));
  }

  // ── Batch oluşturma ──────────────────────────────────────────────────────────

  static async buildAll(
    docs: Dokument[],
  ): Promise<DocumentDigitalTwinModel[]> {
    return Promise.all(docs.map(d => this.build(d)));
  }

  // ── Twin'den kısa dashboard kartı ────────────────────────────────────────────

  static toDashboardCard(twin: DocumentDigitalTwinModel): {
    title: string;
    subtitle: string;
    phase: string;
    phaseIcon: string;
    urgency: number;
    healthScore: number;
    hasTasks: boolean;
    hasConflict: boolean;
  } {
    return {
      title:       twin.content.titel,
      subtitle:    twin.statusSummary,
      phase:       twin.intelligence.lifecycle.phaseLabel,
      phaseIcon:   twin.intelligence.lifecycle.phaseIcon,
      urgency:     twin.ruleResults.urgencyScore,
      healthScore: twin.healthScore,
      hasTasks:    twin.tasks.some(t => !t.erledigt),
      hasConflict: twin.syncState.hasConflict,
    };
  }
}
