/**
 * D-3.2b — Next Steps Mapper
 *
 * Returns actionable next steps for a given role and validation issue.
 * No calculation, no allocability decisions.
 */

import type { ValidationIssue } from '@/features/vermieter/nebenkosten/domain';
import type { NkRole } from './types';

export function nextStepsForRole(role: NkRole, issue: ValidationIssue): string[] {
  switch (issue.code) {
    case 'HEIZKOSTEN_HKVO':
    case 'HEIZKOSTEN_NOT_VERBRAUCH':
      return role === 'mieter'
        ? ['Heizkostenabrechnung auf verbrauchsabhängigen Anteil prüfen', 'Belege für Verbrauchswerte anfordern']
        : ['Heizkostenverordnung prüfen', 'Verbrauchswerte und Verteilung dokumentieren'];

    case 'HEIZKOSTEN_VERBRAUCH_MISSING':
      return role === 'mieter'
        ? ['Verbrauchswerte beim Vermieter anfordern']
        : ['Verbrauchswerte für Heizung/Warmwasser ergänzen'];

    case 'BLOCKED_CATEGORY_PRESENT':
      return role === 'mieter'
        ? ['Nicht umlagefähige Positionen in der Abrechnung markieren', 'Belegeinsicht prüfen']
        : ['Nicht umlagefähige Positionen ausschließen oder rechtlich prüfen'];

    case 'BLOCKED_CATEGORY_INCLUDED':
      return role === 'mieter'
        ? ['Belegeinsicht anfordern', 'Rückfrage beim Vermieter formulieren', 'Bei Unklarheit Rechtsberatung prüfen']
        : ['Belege und Begründung bereithalten', 'Umlageschlüssel prüfen', 'Bei Unklarheit Rechtsberatung prüfen'];

    case 'WARN_CATEGORY_PRESENT':
      return role === 'mieter'
        ? ['Einzelbelege für diese Kategorie anfordern', 'Umlageschlüssel prüfen']
        : ['Belege und Verteilungsschlüssel überprüfen', 'Erläuterung für Mieter vorbereiten'];

    case 'PERIOD_OVER_12_MONTHS':
      return role === 'mieter'
        ? ['Abrechnungszeitraum auf Zulässigkeit prüfen']
        : ['Abrechnungszeitraum auf maximal 12 Monate begrenzen'];

    case 'MANUAL_ALLOCATION_KEY':
      return role === 'mieter'
        ? ['Manuellen Prozentsatz vom Vermieter erklären lassen']
        : ['Manuellen Prozentsatz dokumentieren und begründen'];

    case 'PREPAYMENT_ZERO':
      return role === 'mieter'
        ? ['Vorauszahlungsvereinbarung prüfen']
        : ['Vorauszahlungsvereinbarung überprüfen oder neu aufsetzen'];

    case 'NO_COST_POSITIONS':
      return role === 'mieter'
        ? ['Vollständige Abrechnung anfordern']
        : ['Kostenpositionen hinzufügen'];

    case 'PERSONEN_STATIC_ASSUMPTION':
      return role === 'mieter'
        ? ['Personenzahl während des Zeitraums prüfen']
        : ['Personenwechsel dokumentieren, falls relevant'];

    case 'ABRECHNUNGSFRIST_HINWEIS':
      return role === 'mieter'
        ? ['Zugangsdatum der Abrechnung notieren']
        : ['Versanddatum dokumentieren und Fristenkalender pflegen'];

    case 'MISSING_PERIOD':
    case 'PERIOD_END_BEFORE_START':
      return role === 'mieter'
        ? ['Abrechnungszeitraum vom Vermieter ergänzen lassen']
        : ['Abrechnungszeitraum korrigieren'];

    case 'TOTAL_AREA_ZERO':
    case 'NO_UNITS':
    case 'NO_UNITS_COUNT':
    case 'UNIT_AREA_ZERO':
      return role === 'mieter'
        ? ['Objektdaten in der Abrechnung prüfen']
        : ['Objektdaten und Einheitenflächen korrigieren'];

    case 'NEGATIVE_COST':
      return role === 'mieter'
        ? ['Negative Beträge in der Abrechnung prüfen']
        : ['Negative Kostenbeträge korrigieren'];

    case 'CONSUMPTION_EXCEEDS_TOTAL':
      return role === 'mieter'
        ? ['Verbrauchswerte auf Plausibilität prüfen']
        : ['Verbrauchswerte korrigieren'];

    default:
      // Unknown issue codes must not crash.
      return role === 'mieter'
        ? ['Abrechnungsposition prüfen', 'Bei Unklarheit Belege anfordern']
        : ['Position prüfen und ggf. korrigieren'];
  }
}
