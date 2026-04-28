import type { DocumentType } from './DocumentClassifier';

export type RiskLevel = 'hoch' | 'mittel' | 'niedrig';

export interface RiskAnalysis {
  level: RiskLevel;
  score: number;      // 0-100
  urgencyDays: number | null;  // days until due date, null if no date
  reasons: string[];
}

const AMOUNT_THRESHOLDS = { hoch: 500, mittel: 100 };
const TYPE_BASE_RISK: Record<DocumentType, number> = {
  Mahnung:         85,
  Bußgeld:         80,
  Steuerbescheid:  70,
  Behörde:         60,
  Kündigung:       65,
  Steuer:          50,
  Rechnung:        40,
  Versicherung:    30,
  Termin:          35,
  Vertrag:         25,
  Sonstiges:       10,
};

const DATE_PATTERNS = [
  // DD.MM.YYYY or DD.MM.YY
  /\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/g,
  // YYYY-MM-DD
  /\b(\d{4})-(\d{2})-(\d{2})\b/g,
];

export class RiskAnalyzer {
  analyze(text: string, documentType: DocumentType, amount: number | null): RiskAnalysis {
    const reasons: string[] = [];
    let score = TYPE_BASE_RISK[documentType] ?? 10;

    // Amount modifier
    if (amount !== null) {
      if (amount >= AMOUNT_THRESHOLDS.hoch) {
        score = Math.min(100, score + 20);
        reasons.push(`Hoher Betrag: ${amount.toFixed(2).replace('.', ',')} €`);
      } else if (amount >= AMOUNT_THRESHOLDS.mittel) {
        score = Math.min(100, score + 10);
        reasons.push(`Betrag: ${amount.toFixed(2).replace('.', ',')} €`);
      }
    }

    // Date / urgency modifier
    const dueDate = this.extractLatestDate(text);
    let urgencyDays: number | null = null;

    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      urgencyDays = Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);

      if (urgencyDays < 0) {
        score = Math.min(100, score + 30);
        reasons.push(`Überfällig seit ${Math.abs(urgencyDays)} Tag(en)`);
      } else if (urgencyDays <= 3) {
        score = Math.min(100, score + 25);
        reasons.push(`Frist in ${urgencyDays} Tag(en)`);
      } else if (urgencyDays <= 7) {
        score = Math.min(100, score + 15);
        reasons.push(`Frist diese Woche`);
      } else if (urgencyDays <= 14) {
        score = Math.min(100, score + 5);
        reasons.push(`Frist in 2 Wochen`);
      }
    }

    // Keyword urgency signals
    if (/sofort|unverzüglich|umgehend|dringend|letzte mahnung/i.test(text)) {
      score = Math.min(100, score + 15);
      reasons.push('Dringende Formulierung erkannt');
    }
    if (/gerichtlich|anwalt|inkasso|pfändung/i.test(text)) {
      score = Math.min(100, score + 20);
      reasons.push('Rechtliche Schritte angedroht');
    }

    const level: RiskLevel = score >= 65 ? 'hoch' : score >= 35 ? 'mittel' : 'niedrig';

    return { level, score: Math.round(score), urgencyDays, reasons };
  }

  private extractLatestDate(text: string): Date | null {
    const dates: Date[] = [];
    const now = new Date();

    for (const pattern of DATE_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        try {
          let d: Date;
          if (match[0].includes('-')) {
            // YYYY-MM-DD
            d = new Date(`${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`);
          } else {
            // DD.MM.YYYY
            const year = match[3].length === 2 ? `20${match[3]}` : match[3];
            d = new Date(`${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
          }
          // Only consider dates that are within ±5 years of today
          const diffYears = Math.abs((d.getTime() - now.getTime()) / (365.25 * 86_400_000));
          if (diffYears < 5 && !isNaN(d.getTime())) dates.push(d);
        } catch {}
      }
    }

    if (!dates.length) return null;
    // Return the latest date in the document (most likely the due date)
    return dates.reduce((latest, d) => d > latest ? d : latest);
  }
}
