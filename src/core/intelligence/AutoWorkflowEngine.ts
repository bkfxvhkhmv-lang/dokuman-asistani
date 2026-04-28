/**
 * AutoWorkflowEngine
 * Belge tipine + kuruma + risk seviyesine göre otomatik workflow üretir.
 *
 * Örnek: Jobcenter mektubu geldiğinde otomatik workflow:
 *   1. Özet çıkar  2. Deadline tespit et  3. Takvime ekle
 *   4. Bildirim gönder  5. Gerekirse itiraz taslağı
 */
import { InstitutionBehaviorModel } from './InstitutionBehaviorModel';
import { RuleEngineV4 } from '../rules/RuleEngineV4';

// ── Tipler ────────────────────────────────────────────────────────────────────

export type WorkflowStepType =
  | 'notify'
  | 'calendar'
  | 'einspruch_draft'
  | 'payment_prefill'
  | 'label'
  | 'archive'
  | 'share_partner'
  | 'ai_explain'
  | 'task_create'
  | 'escalate';

export interface WorkflowStep {
  id:          string;
  type:        WorkflowStepType;
  label:       string;
  emoji:       string;
  auto:        boolean;        // true → otomatik çalıştır, false → kullanıcı onayı ister
  payload?:    Record<string, any>;
}

export interface GeneratedWorkflow {
  docId:       string;
  title:       string;
  description: string;
  steps:       WorkflowStep[];
  trigger:     string;         // hangi kural bunu tetikledi
  priority:    'high' | 'medium' | 'low';
  generatedAt: string;
}

// ── Workflow şablonları ───────────────────────────────────────────────────────

type WorkflowTemplate = {
  trigger:     string;
  priority:    GeneratedWorkflow['priority'];
  description: string;
  steps:       Omit<WorkflowStep, 'id'>[];
};

const TEMPLATES: Record<string, WorkflowTemplate> = {
  mahnung: {
    trigger: 'Mahnung erkannt',
    priority: 'high',
    description: 'Mahnung için hızlı aksiyon gerekiyor',
    steps: [
      { type: 'notify',         label: 'Acil bildirim gönder',    emoji: '🔔', auto: true },
      { type: 'calendar',       label: 'Frist takvime ekle',      emoji: '📅', auto: true },
      { type: 'payment_prefill',label: 'Ödeme bilgilerini doldur',emoji: '💶', auto: false },
      { type: 'einspruch_draft',label: 'Einspruch taslağı oluştur',emoji: '✍️', auto: false },
      { type: 'escalate',       label: 'Danışmana ilet',          emoji: '🆘', auto: false },
    ],
  },
  finanzamt: {
    trigger: 'Finanzamt mektubu',
    priority: 'high',
    description: 'Steuerbescheid → genellikle 30 gün içinde işlem gerekir',
    steps: [
      { type: 'notify',         label: 'Bildirim gönder',         emoji: '🔔', auto: true },
      { type: 'calendar',       label: 'Frist takvime ekle',      emoji: '📅', auto: true },
      { type: 'ai_explain',     label: 'AI açıklaması al',        emoji: '🧠', auto: true },
      { type: 'einspruch_draft',label: 'Einspruch taslağı',       emoji: '✍️', auto: false },
      { type: 'task_create',    label: 'Görev oluştur: Steuerberater kontrol et', emoji: '✅', auto: false,
        payload: { titel: 'Steuerberater für diesen Bescheid kontaktieren' } },
    ],
  },
  bussgeld: {
    trigger: 'Bußgeldbescheid',
    priority: 'high',
    description: 'Bußgeld → 14 gün içinde ödeme veya Einspruch',
    steps: [
      { type: 'notify',         label: 'Acil bildirim',           emoji: '🔔', auto: true },
      { type: 'calendar',       label: 'Frist takvime ekle',      emoji: '📅', auto: true },
      { type: 'payment_prefill',label: 'Ödeme bilgilerini doldur',emoji: '💶', auto: false },
      { type: 'einspruch_draft',label: 'Einspruch değerlendir',   emoji: '✍️', auto: false },
    ],
  },
  rechnung: {
    trigger: 'Rechnung erkannt',
    priority: 'medium',
    description: 'Fatura → ödeme zamanında yapılmalı',
    steps: [
      { type: 'calendar',       label: 'Ödeme tarihi takvime ekle',emoji: '📅', auto: true },
      { type: 'payment_prefill',label: 'Ödeme bilgilerini doldur', emoji: '💶', auto: false },
      { type: 'label',          label: 'Etiket: Rechnung',         emoji: '🏷', auto: true,
        payload: { etikett: 'Rechnung' } },
    ],
  },
  behörde: {
    trigger: 'Behördenpost erkannt',
    priority: 'medium',
    description: 'Resmi yazı → okuyup arşivle, gerekirse aksiyon al',
    steps: [
      { type: 'ai_explain',     label: 'AI açıklaması al',        emoji: '🧠', auto: true },
      { type: 'calendar',       label: 'Tarihleri takvime ekle',  emoji: '📅', auto: false },
      { type: 'archive',        label: 'Arşivle',                 emoji: '🗂', auto: false },
    ],
  },
  default: {
    trigger: 'Yeni belge',
    priority: 'low',
    description: 'Standart belge işleme akışı',
    steps: [
      { type: 'ai_explain',     label: 'AI açıklaması al',        emoji: '🧠', auto: true },
      { type: 'label',          label: 'Etiket ekle',             emoji: '🏷', auto: false },
      { type: 'archive',        label: 'Arşivle',                 emoji: '🗂', auto: false },
    ],
  },
};

// ── Yardımcı ─────────────────────────────────────────────────────────────────

function selectTemplate(dok: Record<string, any>): [string, WorkflowTemplate] {
  const text = [dok.absender, dok.rohText, dok.titel, dok.zusammenfassung, dok.typ]
    .filter(Boolean).join(' ').toLowerCase();

  if (/mahnung|inkasso|pfändung/.test(text))    return ['mahnung', TEMPLATES.mahnung];
  if (/finanzamt|steuerbescheid/.test(text))    return ['finanzamt', TEMPLATES.finanzamt];
  if (/bußgeld|bussgeldbescheid/.test(text))    return ['bussgeld', TEMPLATES.bussgeld];
  if (/rechnung|invoice|faktura/.test(text))    return ['rechnung', TEMPLATES.rechnung];
  if (/amt|behörde|bundesamt/.test(text))       return ['behörde', TEMPLATES.behörde];

  return ['default', TEMPLATES.default];
}

// ── Ana sınıf ─────────────────────────────────────────────────────────────────

export class AutoWorkflowEngine {

  static async generate(dok: Record<string, any>): Promise<GeneratedWorkflow> {
    const [templateKey, template] = selectTemplate(dok);

    // Kurumdan öğrenilen bilgiyle adımları zenginleştir
    let extraSteps: Omit<WorkflowStep, 'id'>[] = [];
    if (dok.absender) {
      const sug = await InstitutionBehaviorModel.getSuggestion(dok.absender);
      if (sug?.likelyActions.includes('kalender') && !template.steps.find(s => s.type === 'calendar')) {
        extraSteps.push({ type: 'calendar', label: 'Frist takvime ekle (kurumdan öğrenildi)', emoji: '📅', auto: false });
      }
    }

    // Partner paylaşımı: kuruma göre ekle
    const urgency = RuleEngineV4.urgencyScore(dok);
    if (urgency >= 70 && template.priority === 'high') {
      extraSteps.push({ type: 'share_partner', label: 'Partnere bildir', emoji: '👥', auto: false });
    }

    const allSteps = [...template.steps, ...extraSteps].map((s, i) => ({
      ...s,
      id: `step_${i}_${Date.now()}`,
    }));

    return {
      docId:       dok.id,
      title:       `${template.steps[0]?.emoji ?? '📋'} ${dok.titel ?? 'Belge'}`,
      description: template.description,
      steps:       allSteps,
      trigger:     template.trigger,
      priority:    template.priority,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Otomatik adımları çalıştır (aksiyon map'i enjekte edilir) ─────────────────

  static async executeAutoSteps(
    workflow: GeneratedWorkflow,
    handlers: Partial<Record<WorkflowStepType, (payload?: Record<string, any>) => Promise<void> | void>>,
  ): Promise<string[]> {
    const executed: string[] = [];
    for (const step of workflow.steps.filter(s => s.auto)) {
      const handler = handlers[step.type];
      if (handler) {
        try {
          await handler(step.payload);
          executed.push(step.id);
        } catch {
          // sessizce atla, kullanıcıya göster
        }
      }
    }
    return executed;
  }
}
