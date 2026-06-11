/**
 * D-3.2b — Warning Message Mapper
 *
 * Maps a ValidationIssue to a role-specific German explanation.
 * Falls back to the domain message if no role-specific text exists.
 */

import type { ValidationIssue } from '@/features/vermieter/nebenkosten/domain';
import type { NkRole } from './types';

export function warningMessageForRole(role: NkRole, issue: ValidationIssue): string {
  switch (issue.code) {
    case 'HEIZKOSTEN_HKVO':
      return role === 'mieter'
        ? 'Heizkosten müssen nach der Heizkostenverordnung mindestens 50–70 % verbrauchsabhängig abgerechnet werden. Prüfen Sie, ob Ihre Abrechnung diesem Anteil entspricht.'
        : 'Heizkostenverordnung beachten: mind. 50–70 % verbrauchsabhängig abrechnen. Andernfalls besteht Widerspruchsrisiko.';

    case 'HEIZKOSTEN_NOT_VERBRAUCH':
      return role === 'mieter'
        ? 'Für Heizkosten wurde kein verbrauchsabhängiger Schlüssel verwendet. Sie können prüfen, ob die Abrechnung den Vorgaben der Heizkostenverordnung entspricht.'
        : 'Für Heizkosten wird ein verbrauchsabhängiger Umlageschlüssel empfohlen. Bitte prüfen, ob die gewählte Verteilung standhält.';

    case 'HEIZKOSTEN_VERBRAUCH_MISSING':
      return role === 'mieter'
        ? 'Verbrauchswerte für Heiz-/Warmwasserkosten fehlen. Ohne diese Werte kann die verbrauchsabhängige Abrechnung nicht nachvollzogen werden.'
        : 'Verbrauchswerte für Heiz-/Warmwasserkosten fehlen. Bitte ergänzen, da sonst die Abrechnung nicht vermittelt werden kann.';

    case 'BLOCKED_CATEGORY_PRESENT':
      return role === 'mieter'
        ? 'Einige Kostenpositionen sind laut Betriebskostenverordnung nicht umlagefähig. Diese Positionen sollten nicht auf Sie umgelegt werden.'
        : 'Einige Kostenpositionen sind laut Betriebskostenverordnung nicht umlagefähig. Prüfen Sie, ob diese aus der Abrechnung ausgeschlossen wurden.';

    case 'BLOCKED_CATEGORY_INCLUDED':
      return role === 'mieter'
        ? 'Eine als nicht umlagefähig markierte Kostenposition wurde in die Abrechnung einbezogen. Diese Position kann Anlass für eine Rückfrage oder Prüfung sein.'
        : 'Eine als nicht umlagefähig markierte Kostenposition wurde manuell eingeschlossen. Bitte vor dem Versand rechtlich prüfen.';

    case 'WARN_CATEGORY_PRESENT':
      return role === 'mieter'
        ? 'Einige Kostenkategorien erfordern besondere Prüfung. Bei Unklarheit können Sie Belege anfordern.'
        : 'Einige Kostenkategorien erfordern besondere Prüfung. Stellen Sie sicher, dass Belege und Verteilung nachvollziehbar sind.';

    case 'PERIOD_OVER_12_MONTHS':
      return role === 'mieter'
        ? 'Der Abrechnungszeitraum überschreitet 12 Monate. Prüfen Sie, ob die Abrechnung zeitlich zulässig ist.'
        : 'Der Abrechnungszeitraum überschreitet 12 Monate. Bitte prüfen und ggf. abgrenzen.';

    case 'MANUAL_ALLOCATION_KEY':
      return role === 'mieter'
        ? 'Für eine Kostenposition wurde ein manueller Umlageschlüssel verwendet. Lassen Sie sich den gewählten Prozentsatz erklären.'
        : 'Für eine Kostenposition wurde ein manueller Umlageschlüssel verwendet. Bitte dokumentieren Sie die Begründung.';

    case 'PREPAYMENT_ZERO':
      return role === 'mieter'
        ? 'Die vereinbarte Vorauszahlung beträgt 0 €. Prüfen Sie, ob die Nachzahlung den tatsächlichen Kosten entspricht.'
        : 'Die Vorauszahlung beträgt 0 €. Die Abrechnung führt daher direkt zu einer Nachzahlung.';

    case 'NO_COST_POSITIONS':
      return role === 'mieter'
        ? 'Es sind keine Kostenpositionen vorhanden. Eine Abrechnung ohne Kosten ist nicht möglich.'
        : 'Es sind keine Kostenpositionen vorhanden. Bitte fügen Sie mindestens eine Kostenposition hinzu.';

    case 'PERSONEN_STATIC_ASSUMPTION':
      return role === 'mieter'
        ? 'Die Personenzahl wird als unverändert für den ganzen Zeitraum angenommen. Bei Personenwechsel kann das die Verteilung beeinflussen.'
        : 'Die Personenzahl wird als statischer Wert für den ganzen Zeitraum angenommen. Personenwechsel werden nicht berücksichtigt.';

    case 'ABRECHNUNGSFRIST_HINWEIS':
      return role === 'mieter'
        ? 'Die Betriebskostenabrechnung muss in der Regel innerhalb von 12 Monaten nach Ablauf des Abrechnungszeitraums zugehen. Prüfen Sie das Datum.'
        : 'Die Betriebskostenabrechnung muss in der Regel innerhalb von 12 Monaten nach Ablauf des Abrechnungszeitraums zugehen (§ 556 Abs. 3 BGB). Bitte prüfen Sie das Versanddatum.';

    case 'MISSING_PERIOD':
    case 'PERIOD_END_BEFORE_START':
    case 'TOTAL_AREA_ZERO':
    case 'NO_UNITS':
    case 'NO_UNITS_COUNT':
    case 'UNIT_AREA_ZERO':
    case 'NEGATIVE_COST':
    case 'CONSUMPTION_EXCEEDS_TOTAL':
      return role === 'mieter'
        ? `Abrechnungsfehler erkannt: ${issue.messageDe}`
        : issue.messageDe;

    default:
      // Unknown issue codes must not crash.
      return issue.messageDe;
  }
}
