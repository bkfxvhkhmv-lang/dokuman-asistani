import type { SensitiveRegion, DetectionResult, SensitiveDataType } from '../types';

interface TextPattern {
  type: SensitiveDataType;
  regex: RegExp;
  label: (match: string) => string;
}

const PATTERNS: TextPattern[] = [
  {
    type: 'iban',
    regex: /\b([A-Z]{2}\d{2}[\s\d]{15,32})\b/g,
    label: (m) => `IBAN ${m.replace(/\s/g, '').slice(0, 10)}…`,
  },
  {
    type: 'tax_id',
    // German Steuernummer: 13 digits, sometimes with slashes
    regex: /\b(?:Steuer(?:nummer|nr\.?|id)?[:\s]*)?(\d{2,3}[\s/]\d{3}[\s/]\d{5}|\d{10,13})\b/gi,
    label: () => 'Steuernummer',
  },
  {
    type: 'tax_id',
    // German Identifikationsnummer (11 digits, starts with non-zero)
    regex: /\bIdentifikationsnummer[:\s]*(\d{11})\b/gi,
    label: () => 'Steuer-ID',
  },
  {
    type: 'phone',
    regex: /(?:\+49|0049|0)[\s\-]?(\d{2,5})[\s\-]?(\d{3,12})(?:[\s\-]?\d{1,5})?/g,
    label: () => 'Telefonnummer',
  },
  {
    type: 'plate',
    // German license plates: AB-CD 1234 or AB-C 123
    regex: /\b([A-ZÄÖÜ]{1,3})[\s\-]([A-Z]{1,2})[\s]?(\d{1,4}[EH]?)\b/g,
    label: (m) => `Kennzeichen ${m}`,
  },
  {
    type: 'address',
    // Street + number: "Musterstraße 12" or "Musterstr. 12a"
    regex: /\b([A-ZÄÖÜ][a-zäöüß]+(?:straße|str\.|gasse|weg|platz|allee|ring|damm|chaussee))\s+(\d{1,4}[a-z]?)\b/gi,
    label: () => 'Adresse',
  },
];

export class SensitiveDataDetector {
  async detect(imageUri: string, rawText?: string): Promise<SensitiveRegion[]> {
    if (!rawText?.trim()) return [];
    return this.detectFromText(rawText);
  }

  detectFromText(text: string): SensitiveRegion[] {
    const found: SensitiveRegion[] = [];
    const lines = text.split('\n');
    const totalLines = Math.max(lines.length, 1);

    for (const pattern of PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const value = match[0].trim();
        if (!value) continue;

        // Estimate vertical position from character offset
        const charsBefore = match.index;
        const linesBefore = text.slice(0, charsBefore).split('\n').length - 1;
        const lineIndex = Math.min(linesBefore, totalLines - 1);
        const yNorm = lineIndex / totalLines;
        const heightNorm = Math.max(1 / totalLines, 0.04);

        // Estimate horizontal position from line content
        const line = lines[lineIndex] || '';
        const lineLen = Math.max(line.length, 1);
        const matchInLine = line.indexOf(value.slice(0, 20));
        const xNorm = matchInLine >= 0 ? matchInLine / lineLen : 0.1;
        const widthNorm = Math.min(0.8, (value.length / lineLen) + 0.05);

        found.push({
          type: pattern.type,
          x: Math.max(0, xNorm),
          y: Math.max(0, yNorm - 0.01),
          width: widthNorm,
          height: heightNorm + 0.02,
          label: pattern.label(value),
          value,
        });
      }
    }

    return this.deduplicateRegions(found);
  }

  buildDetectionResult(regions: SensitiveRegion[]): DetectionResult {
    const highRiskTypes: SensitiveDataType[] = ['iban', 'tax_id'];
    const hasHighRisk = regions.some(r => highRiskTypes.includes(r.type));
    const summary = [...new Set(regions.map(r => r.label ?? r.type))];
    return { regions, hasHighRisk, summary };
  }

  private deduplicateRegions(regions: SensitiveRegion[]): SensitiveRegion[] {
    const seen = new Set<string>();
    return regions.filter(r => {
      const key = `${r.type}:${r.value?.replace(/\s/g, '').slice(0, 20)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
