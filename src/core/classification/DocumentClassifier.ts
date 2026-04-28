/**
 * DocumentClassifier — Germany/Austria/Switzerland document type detection.
 * Uses keyword pattern matching with confidence weighting.
 * Each rule is a weighted set of patterns; the highest-scoring type wins.
 */

export type DocumentType =
  | 'Rechnung'
  | 'Mahnung'
  | 'Bußgeld'
  | 'Behörde'
  | 'Steuerbescheid'
  | 'Steuer'
  | 'Termin'
  | 'Versicherung'
  | 'Vertrag'
  | 'Kündigung'
  | 'Sonstiges';

export interface ClassificationRule {
  type: DocumentType;
  patterns: Array<{ regex: RegExp; weight: number }>;
  minScore: number;
}

export interface ClassificationResult {
  type: DocumentType;
  confidence: number;  // 0-100
  scores: Partial<Record<DocumentType, number>>;
  extractedSender?: string;
  extractedIban?: string;
  extractedAmount?: number | null;
}

const RULES: ClassificationRule[] = [
  {
    type: 'Mahnung',
    minScore: 0.3,
    patterns: [
      { regex: /mahnung|zahlungserinnerung|inkasso|mahngebühr/i, weight: 1.0 },
      { regex: /letzte(?:r)? chance|forderung\s+(?:über|in Höhe)/i, weight: 0.7 },
      { regex: /rückstand|offene(?:r)? betrag/i, weight: 0.5 },
    ],
  },
  {
    type: 'Bußgeld',
    minScore: 0.3,
    patterns: [
      { regex: /bußgeld|bußgeldbescheid|ordnungswidrigkeit|knöllchen/i, weight: 1.0 },
      { regex: /geschwindigkeitsüberschreitung|parkverstoß|rotlicht/i, weight: 0.9 },
      { regex: /fahrerlaubnisbehörde|straßenverkehrsamt/i, weight: 0.7 },
      { regex: /\b(?:EUR?|€)\s*\d+[.,]\d{0,2}\b.*(?:strafe|bußgeld)/i, weight: 0.6 },
    ],
  },
  {
    type: 'Steuerbescheid',
    minScore: 0.35,
    patterns: [
      { regex: /steuerbescheid|einkommensteuerbescheid|körperschaftsteuerbescheid/i, weight: 1.0 },
      { regex: /finanzamt|steuerliche?\s+(?:fest|nach|vor)setzung/i, weight: 0.8 },
      { regex: /steuer(?:nummer|jahr|veranlagung)/i, weight: 0.6 },
    ],
  },
  {
    type: 'Steuer',
    minScore: 0.3,
    patterns: [
      { regex: /steuererklärung|einkommensteuererklärung|umsatzsteuererklärung/i, weight: 1.0 },
      { regex: /steuerformular|anlage[_ ](?:n|s|r|g|eür)/i, weight: 0.8 },
      { regex: /werbungskosten|sonderausgaben|steuer(?:absetzbar|vorteil)/i, weight: 0.5 },
    ],
  },
  {
    type: 'Kündigung',
    minScore: 0.35,
    patterns: [
      { regex: /kündigung|aufhebungsvertrag|auflösungsvertrag/i, weight: 1.0 },
      { regex: /hiermit\s+kündige[n]?\s+ich|fristlos\s+kündigen/i, weight: 0.9 },
      { regex: /kündigungsfrist|kündigungsschutz/i, weight: 0.7 },
    ],
  },
  {
    type: 'Versicherung',
    minScore: 0.3,
    patterns: [
      { regex: /versicherung(?:spolice|sschein|svertrag|sprämie|sbeitrag)/i, weight: 1.0 },
      { regex: /krankenversicherung|haftpflicht|hausrat|kfz-versicherung/i, weight: 0.9 },
      { regex: /deckungsschutz|selbstbehalt|versicherungsnehmer/i, weight: 0.7 },
    ],
  },
  {
    type: 'Vertrag',
    minScore: 0.3,
    patterns: [
      { regex: /(?:miet|kauf|werk|dienst|rahmen)vertrag/i, weight: 1.0 },
      { regex: /vertragspartner|vertragsgegenstand|vertragsschluss/i, weight: 0.8 },
      { regex: /hiermit\s+(?:vereinbaren|schließen)\s+die/i, weight: 0.6 },
    ],
  },
  {
    type: 'Termin',
    minScore: 0.3,
    patterns: [
      { regex: /termin(?:vereinbarung|bestätigung|absage|erinnerung)/i, weight: 1.0 },
      { regex: /arzttermin|behördentermin|vorladung|gerichtstermin/i, weight: 0.9 },
      { regex: /bitte\s+erscheinen\s+sie|ihr\s+termin\s+am/i, weight: 0.8 },
    ],
  },
  {
    type: 'Behörde',
    minScore: 0.25,
    patterns: [
      { regex: /einwohnermeldeamt|bürgeramt|ausländerbehörde|jobcenter|agentur für arbeit/i, weight: 1.0 },
      { regex: /bescheid|amtlich|behörde|amt\s+für/i, weight: 0.6 },
      { regex: /antragsteller|aktenzeichen|behördlicher/i, weight: 0.5 },
    ],
  },
  {
    type: 'Rechnung',
    minScore: 0.2,
    patterns: [
      { regex: /rechnung(?:snummer)?|invoice|faktura/i, weight: 1.0 },
      { regex: /rechnungsdatum|rechnungsbetrag|zahlungsziel/i, weight: 0.9 },
      { regex: /\biban\b|bankverbindung|kontonummer/i, weight: 0.5 },
      { regex: /bitte\s+(?:überweisen|zahlen|begleichen)/i, weight: 0.7 },
      { regex: /mehrwertsteuer|mwst|umsatzsteuer/i, weight: 0.5 },
    ],
  },
];

const AMOUNT_REGEX = /(?:EUR?|€)\s*([\d.,]+)/gi;
const IBAN_REGEX = /\b([A-Z]{2}\d{2}[\s\d]{10,30})\b/;
const SENDER_REGEX = /^(.{5,60})$/m;

export class DocumentClassifier {
  classify(text: string): ClassificationResult {
    const scores: Partial<Record<DocumentType, number>> = {};

    for (const rule of RULES) {
      let ruleScore = 0;
      let maxWeight = 0;
      for (const { regex, weight } of rule.patterns) {
        maxWeight += weight;
        if (regex.test(text)) ruleScore += weight;
      }
      const normalizedScore = maxWeight > 0 ? ruleScore / maxWeight : 0;
      if (normalizedScore >= rule.minScore) {
        scores[rule.type] = normalizedScore;
      }
    }

    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const [bestType, bestScore] = sorted[0] ?? ['Sonstiges', 0];

    return {
      type: (bestScore > 0 ? bestType : 'Sonstiges') as DocumentType,
      confidence: Math.min(100, Math.round((bestScore as number) * 100)),
      scores,
      extractedSender: this.extractSender(text),
      extractedIban: this.extractIban(text),
      extractedAmount: this.extractAmount(text),
    };
  }

  private extractAmount(text: string): number | null {
    const matches = [...text.matchAll(AMOUNT_REGEX)];
    if (!matches.length) return null;
    const amounts = matches.map(m => parseFloat(m[1].replace(/\./g, '').replace(',', '.'))).filter(n => !isNaN(n) && n > 0);
    return amounts.length ? Math.max(...amounts) : null;
  }

  private extractIban(text: string): string | undefined {
    const m = text.match(IBAN_REGEX);
    return m ? m[1].replace(/\s/g, '') : undefined;
  }

  private extractSender(text: string): string | undefined {
    const lines = text.split('\n').filter(l => l.trim().length > 4 && l.trim().length < 80);
    return lines[0]?.trim();
  }
}
