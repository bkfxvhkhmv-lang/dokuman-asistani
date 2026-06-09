import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type InventoryEntry = {
  id: string;
  category: string;
  institution_type: string;
  document_type: string;
  action_type: string;
  title: string;
  risk_level: string;
  required_fields: string[];
  optional_fields: string[];
  requires_user_facts: boolean;
  requires_legal_caution: boolean;
  delivery_channel: string;
  priority: string;
  notes: string;
  sensitive_fields?: string[];
  attachment_hints?: string[];
  [key: string]: unknown;
};

const INVENTORY_PATH = path.resolve(process.cwd(), 'docs/reply-assistant/approved-inventory-de.yaml');
const BANNED_LEAKAGE_REGEX = /\b(for|della|Icha|must|is|ve|yasal|şablon|evrak|gönder|oversandt|Leird|benannt|ancora|befindet)\b/;
const SNAKE_CASE_REGEX = /^[a-z0-9_]+$/;
const KNOWN_RISK_LEVELS = new Set(['low', 'medium', 'high']);
const KNOWN_DELIVERY_CHANNELS = new Set([
  'brief',
  'elster_or_letter',
  'letter',
  'letter_or_email',
  'letter_or_fax',
  'letter_or_filiale',
  'letter_or_online',
  'letter_or_portal',
  'portal_or_email',
  'portal_or_letter',
  'registered_letter',
  'registered_letter_or_fax',
  'registered_letter_or_form',
]);
const REQUIRED_KEYS: string[] = [
  'id',
  'category',
  'institution_type',
  'document_type',
  'action_type',
  'title',
  'risk_level',
  'required_fields',
  'optional_fields',
  'requires_user_facts',
  'requires_legal_caution',
  'delivery_channel',
  'priority',
  'notes',
];
const EXPECTED_CATEGORY_COUNTS: Record<string, number> = {
  arbeitsagentur_jobcenter_ergaenzend: 7,
  auslaenderbehoerde: 9,
  bank: 5,
  bussgeld: 8,
  energie_wasser_telekom: 7,
  finanzamt: 5,
  gemeinde_stadt_zoll: 8,
  jobcenter_main: 5,
  krankenkasse: 8,
  krankenkasse_advanced: 3,
  mahngericht_inkasso_gericht: 8,
  miete: 7,
  pflegekasse_advanced: 1,
  schufa: 2,
  versicherung: 7,
};

function loadInventory(): InventoryEntry[] {
  const python = [
    'import json, sys, yaml',
    'from pathlib import Path',
    `path = Path(${JSON.stringify(INVENTORY_PATH)})`,
    'data = yaml.safe_load(path.read_text())',
    'json.dump(data, sys.stdout, ensure_ascii=False)',
  ].join('; ');

  const raw = execFileSync('python3', ['-c', python], { encoding: 'utf8' });
  return JSON.parse(raw) as InventoryEntry[];
}

function collectFieldKeys(entry: InventoryEntry): string[] {
  return [
    ...(entry.required_fields ?? []),
    ...(entry.optional_fields ?? []),
    ...(entry.sensitive_fields ?? []),
    ...(entry.attachment_hints ?? []),
  ];
}

describe('approved canonical German reply inventory', () => {
  const inventory = loadInventory();
  const rawYaml = readFileSync(INVENTORY_PATH, 'utf8');

  it('parses YAML successfully', () => {
    expect(Array.isArray(inventory)).toBe(true);
  });

  it('contains exactly 90 templates', () => {
    expect(inventory).toHaveLength(90);
  });

  it('matches expected category counts', () => {
    const counts = inventory.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.category] = (acc[entry.category] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual(EXPECTED_CATEGORY_COUNTS);
  });

  it('uses unique ids', () => {
    const ids = inventory.map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains all required canonical fields', () => {
    for (const entry of inventory) {
      for (const key of REQUIRED_KEYS) {
        expect(entry).toHaveProperty(key);
      }
    }
  });

  it('uses only known risk levels', () => {
    for (const entry of inventory) {
      expect(KNOWN_RISK_LEVELS.has(entry.risk_level)).toBe(true);
    }
  });

  it('uses only known delivery channels', () => {
    for (const entry of inventory) {
      expect(KNOWN_DELIVERY_CHANNELS.has(entry.delivery_channel)).toBe(true);
    }
  });

  it('keeps ids and field keys lowercase snake_case without umlauts', () => {
    for (const entry of inventory) {
      expect(entry.id).toMatch(SNAKE_CASE_REGEX);
      for (const fieldKey of collectFieldKeys(entry)) {
        expect(fieldKey).toMatch(SNAKE_CASE_REGEX);
      }
    }
  });

  it('declares sensitive_fields only from required_fields or optional_fields', () => {
    for (const entry of inventory) {
      const declared = new Set([...(entry.required_fields ?? []), ...(entry.optional_fields ?? [])]);
      for (const field of entry.sensitive_fields ?? []) {
        expect(declared.has(field)).toBe(true);
      }
    }
  });

  it('contains no banned leakage tokens in titles or notes', () => {
    for (const entry of inventory) {
      expect(entry.title).not.toMatch(BANNED_LEAKAGE_REGEX);
      expect(entry.notes).not.toMatch(BANNED_LEAKAGE_REGEX);
    }
  });

  it('contains no body text fields in inventory entries', () => {
    for (const entry of inventory) {
      expect(entry).not.toHaveProperty('body');
      expect(entry).not.toHaveProperty('subject');
      expect(entry).not.toHaveProperty('subjectTemplate');
      expect(entry).not.toHaveProperty('safetyNote');
    }
    expect(rawYaml).not.toMatch(/^\s*body:/m);
    expect(rawYaml).not.toMatch(/^\s*subject:/m);
    expect(rawYaml).not.toMatch(/^\s*subjectTemplate:/m);
    expect(rawYaml).not.toMatch(/^\s*safetyNote:/m);
  });
});
