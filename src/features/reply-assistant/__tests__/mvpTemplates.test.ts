import { renderReplyTemplate, PLACEHOLDER_REGEX } from '@/features/reply-assistant/domain/renderTemplate';
import type { ReplyTemplate, ReplyTemplateValues } from '@/features/reply-assistant/domain/types';
import { germanMvpReplyTemplates } from '@/features/reply-assistant/templates/de';

const BANNED_LEAKAGE_REGEX = /\b(for|della|Icha|must|is|ve|yasal|şablon|evrak|gönder|oversandt|Leird|benannt|ancora|befindet)\b/;
const KNOWN_ATTACHMENT_HINTS = new Set(['optional_id_copy_redacted', 'payment_receipt']);

function mockValueForField(key: string): string {
  const map: Record<string, string> = {
    aktenzeichen: 'AZ-12345',
    name: 'Max Mustermann',
    adresse: 'Musterstraße 1, 12345 Berlin',
    neue_frist: '30.06.2026',
    begruendung_frist: 'mir fehlen noch Unterlagen',
    einspruch_begruendung: 'Der Sachverhalt ist aus meiner Sicht unzutreffend.',
    bg_nummer: 'BG-778899',
    unterlagen_liste: '- Mietvertrag\n- Kontoauszüge',
    datum_schreiben: '03.06.2026',
    antrag_datum: '10.05.2026',
    antrag_typ: 'Weiterbewilligung',
    zeitraum_von: '01.07.2026',
    aenderungen_details: 'Keine Änderungen seit dem letzten Bewilligungszeitraum.',
    notlage_begruendung: 'Ich bin aktuell nicht in der Lage, Miete und Lebensunterhalt zu sichern.',
    konto_details: 'DE12 3456 7890 1234 5678 90',
    steuernummer: '12/345/67890',
    steuerart_jahr: 'Einkommensteuer 2025',
    bescheid_datum: '20.05.2026',
    offener_betrag: '850,00',
    monatliche_rate: '100,00',
    erste_rate_datum: '01.07.2026',
    begruendung_finanzielle_lage: 'Die aktuelle Liquidität reicht nicht für eine Einmalzahlung.',
    bescheid_typ: 'Einkommensteuerbescheid',
    vermieter_name: 'Müller',
    vermieter_adresse: 'Vermieterweg 2, 12345 Berlin',
    mietwohnung_lage: '2. OG links, Musterstraße 1, 12345 Berlin',
    mangel_beschreibung: 'Die Heizung im Wohnzimmer funktioniert seit Tagen nicht.',
    mangel_festgestellt_datum: '01.06.2026',
    terminvorschlag: '10.06.2026 zwischen 10 und 12 Uhr',
    mangel_anzeige_datum: '02.06.2026',
    behebungs_frist: '20.06.2026',
    abrechnungs_zeitraum: '01.01.2025 bis 31.12.2025',
    abrechnungs_datum: '15.05.2026',
    unvollstaendige_punkte: 'Hausmeisterkosten und Heizkosten',
    hausverwaltung_name: 'Hausverwaltung Nord',
    hausverwaltung_adresse: 'Verwalterstraße 8, 12345 Berlin',
    abrechnungs_jahr: '2025',
    spezifische_positionen: 'Heizkosten und Wartungskosten',
    geburtsdatum: '01.01.1990',
    geburtsort: 'Berlin',
    vorige_adresse: 'Alte Straße 5, 12000 Berlin',
    inkasso_name: 'Inkasso GmbH',
    inkasso_adresse: 'Inkassoweg 9, 12345 Berlin',
    zahlungs_nachweis_details: 'Überweisung vom 30.05.2026 über 250,00 Euro, Verwendungszweck AZ-12345',
  };
  return map[key] ?? `wert_${key}`;
}

function buildValues(template: ReplyTemplate): ReplyTemplateValues {
  const values: ReplyTemplateValues = {};
  for (const key of template.requiredFields ?? []) values[key] = mockValueForField(key);
  for (const key of template.optionalFields ?? []) values[key] = mockValueForField(key);
  return values;
}

function extractPlaceholders(text: string): string[] {
  return Array.from(text.matchAll(PLACEHOLDER_REGEX)).map(match => match[1]);
}

describe('german MVP templates registry', () => {
  it('contains exactly 20 templates', () => {
    expect(germanMvpReplyTemplates).toHaveLength(20);
  });

  it('uses unique ids', () => {
    const ids = germanMvpReplyTemplates.map(template => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders every template with generated mock fields', () => {
    for (const template of germanMvpReplyTemplates) {
      const result = renderReplyTemplate({
        template,
        values: buildValues(template),
      });
      expect(result.ok).toBe(true);
      expect(result.subject).not.toBeNull();
      expect(result.body).not.toBeNull();
      expect(result.subject ?? '').not.toMatch(/{{[^}]+}}/);
      expect(result.body ?? '').not.toMatch(/{{[^}]+}}/);
    }
  });

  it('fails when each required field is removed', () => {
    for (const template of germanMvpReplyTemplates) {
      for (const requiredField of template.requiredFields ?? []) {
        const values = buildValues(template);
        values[requiredField] = '';
        const result = renderReplyTemplate({ template, values });
        expect(result.ok).toBe(false);
        expect(result.blockedReason).toBe('missing_required');
        expect(result.subject).toBeNull();
        expect(result.body).toBeNull();
        expect(result.missingRequiredFields).toContain(requiredField);
      }
    }
  });

  it('declares every placeholder in subject and body', () => {
    for (const template of germanMvpReplyTemplates) {
      const declared = new Set([...(template.requiredFields ?? []), ...(template.optionalFields ?? [])]);
      for (const placeholder of [
        ...extractPlaceholders(template.subjectTemplate),
        ...extractPlaceholders(template.body),
      ]) {
        expect(declared.has(placeholder)).toBe(true);
      }
    }
  });

  it('contains no banned leakage in subject, body, or safetyNote', () => {
    for (const template of germanMvpReplyTemplates) {
      expect(template.subjectTemplate).not.toMatch(BANNED_LEAKAGE_REGEX);
      expect(template.body).not.toMatch(BANNED_LEAKAGE_REGEX);
      expect(template.safetyNote ?? '').not.toMatch(BANNED_LEAKAGE_REGEX);
    }
  });

  it('uses no uppercase placeholder keys', () => {
    for (const template of germanMvpReplyTemplates) {
      for (const placeholder of [
        ...extractPlaceholders(template.subjectTemplate),
        ...extractPlaceholders(template.body),
      ]) {
        expect(placeholder).toMatch(/^[a-z0-9_]+$/);
      }
    }
  });

  it('keeps sensitiveFields and attachmentHints arrays valid when present', () => {
    for (const template of germanMvpReplyTemplates) {
      const declared = new Set([...(template.requiredFields ?? []), ...(template.optionalFields ?? [])]);
      if (template.sensitiveFields) {
        expect(Array.isArray(template.sensitiveFields)).toBe(true);
        for (const field of template.sensitiveFields) {
          expect(declared.has(field)).toBe(true);
        }
      }
      if (template.attachmentHints) {
        expect(Array.isArray(template.attachmentHints)).toBe(true);
        for (const hint of template.attachmentHints) {
          expect(KNOWN_ATTACHMENT_HINTS.has(hint)).toBe(true);
        }
      }
    }
  });
});
