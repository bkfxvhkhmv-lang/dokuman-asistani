import { installRule, uninstallRule } from '../../services/v4Api';

export interface LocalRule {
  id: string;
  name: string;
  pattern: string;
  action: {
    typ?: string;
    risiko?: string;
    ordner?: string;
    etikett?: string;
  };
  priority?: number;
}

// ── Yerleşik kurallar ─────────────────────────────────────────────────────────

const BUILTIN_RULES: LocalRule[] = [
  {
    id: '__builtin_mahnung',
    name: 'Mahnung / Inkasso',
    pattern: 'mahnung|letzte.{0,10}erin|inkasso|pfändung|mahnbescheid',
    action: { typ: 'Mahnung', risiko: 'hoch', etikett: 'Dringend' },
    priority: 100,
  },
  {
    id: '__builtin_finanzamt',
    name: 'Finanzamt → Steuerbescheid',
    pattern: 'finanzamt|steuerbescheid|steuerrückstand|einkommensteuer',
    action: { typ: 'Steuerbescheid', risiko: 'hoch', etikett: 'Steuer' },
    priority: 90,
  },
  {
    id: '__builtin_kuendigung',
    name: 'Kündigung',
    pattern: 'kündigung|kündigt|gekündigt|fristlos',
    action: { typ: 'Sonstiges', risiko: 'mittel', etikett: 'Kündigung' },
    priority: 85,
  },
  {
    id: '__builtin_bussgeld',
    name: 'Bußgeld / Knöllchen',
    pattern: 'bußgeld|bussgeldbescheid|ordnungswidrigkeit|knöllchen|strafzettel',
    action: { typ: 'Bußgeld', risiko: 'hoch' },
    priority: 80,
  },
  {
    id: '__builtin_krankenkasse',
    name: 'Krankenversicherung',
    pattern: 'krankenkasse|krankenversicherung|aok|tkk|barmer|dak|techniker',
    action: { typ: 'Versicherung', etikett: 'Gesundheit' },
    priority: 70,
  },
  {
    id: '__builtin_rechnung',
    name: 'Rechnung',
    pattern: 'rechnung|invoice|faktura|zahlungsaufforderung',
    action: { typ: 'Rechnung' },
    priority: 50,
  },
  {
    id: '__builtin_behoerde',
    name: 'Behörde',
    pattern: 'amt|behörde|verwaltung|bundesamt|landesamt|ministerium|senat',
    action: { typ: 'Behörde' },
    priority: 40,
  },
  {
    id: '__builtin_versicherung',
    name: 'Versicherung allgemein',
    pattern: 'versicherung|police|haftpflicht|hausrat|kfz-versicherung',
    action: { typ: 'Versicherung' },
    priority: 35,
  },
];

// ── Yardımcı ─────────────────────────────────────────────────────────────────

function matchRule(rule: LocalRule, doc: Record<string, any>): boolean {
  const haystack = [doc.absender, doc.rohText, doc.titel, doc.zusammenfassung]
    .filter(Boolean).join(' ').toLowerCase();
  try {
    return new RegExp(rule.pattern, 'i').test(haystack);
  } catch {
    return false;
  }
}

// ── Ana sınıf ─────────────────────────────────────────────────────────────────

export class RuleEngineV4 {
  static applyRules(
    doc: Record<string, any>,
    userRules: LocalRule[] = [],
  ): Record<string, any> & { _appliedRules: string[] } {
    const allRules = [...BUILTIN_RULES, ...userRules]
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    let updated = { ...doc };
    const applied: string[] = [];
    let typSet = false;
    let risikoSet = false;

    for (const rule of allRules) {
      if (!matchRule(rule, doc)) continue;

      if (rule.action.typ && !typSet) {
        updated.typ = rule.action.typ;
        typSet = true;
      }
      if (rule.action.risiko && !risikoSet) {
        updated.risiko = rule.action.risiko;
        risikoSet = true;
      }
      if (rule.action.ordner && !updated._ordner) {
        updated._ordner = rule.action.ordner;
      }
      if (rule.action.etikett) {
        const existing: string[] = updated.etiketten ?? [];
        if (!existing.includes(rule.action.etikett)) {
          updated.etiketten = [...existing, rule.action.etikett];
        }
      }
      applied.push(rule.id);
    }

    return { ...updated, _appliedRules: applied };
  }

  /** Aciliyet skoru 0–100 */
  static urgencyScore(doc: Record<string, any>): number {
    let score = 0;
    if (doc.risiko === 'hoch')   score += 50;
    if (doc.risiko === 'mittel') score += 25;

    if (doc.frist) {
      const days = Math.ceil((new Date(doc.frist).getTime() - Date.now()) / 86_400_000);
      if (days < 0)    score += 40;
      else if (days <= 3)  score += 30;
      else if (days <= 7)  score += 15;
      else if (days <= 14) score += 5;
    }

    if (doc.typ === 'Mahnung')        score += 20;
    if (doc.typ === 'Steuerbescheid') score += 10;
    if (doc.typ === 'Bußgeld')        score += 15;
    if (doc.betrag && doc.betrag > 500) score += 5;

    return Math.min(100, score);
  }

  static classify(doc: Record<string, any>): 'urgent' | 'thisWeek' | 'info' {
    const s = this.urgencyScore(doc);
    if (s >= 60) return 'urgent';
    if (s >= 25) return 'thisWeek';
    return 'info';
  }

  static async installFromMarketplace(ruleId: string, config?: Record<string, any>): Promise<void> {
    await installRule(ruleId, (config ?? null) as any);
  }

  static async uninstallFromMarketplace(ruleId: string): Promise<void> {
    await uninstallRule(ruleId);
  }
}
