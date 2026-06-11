/**
 * D-3.0 — Validation
 *
 * Validates a NebenkostenAbrechnung for structural and logical issues.
 */

import type { NebenkostenAbrechnung, ValidationIssue } from './types';
import { COST_CATEGORIES } from './costCategories';

function monthsBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  return years * 12 + months + 1;
}

export function validateAbrechnung(a: NebenkostenAbrechnung): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // ERRORS
  if (!a.billingPeriod) {
    issues.push({
      code: 'MISSING_PERIOD',
      messageDe: 'Abrechnungszeitraum fehlt.',
      severity: 'error',
      scope: 'abrechnung',
    });
  } else {
    if (a.billingPeriod.endDate < a.billingPeriod.startDate) {
      issues.push({
        code: 'PERIOD_END_BEFORE_START',
        messageDe: 'Enddatum liegt vor dem Startdatum.',
        severity: 'error',
        scope: 'abrechnung',
      });
    }
  }

  if (a.property.totalAreaSqm <= 0) {
    issues.push({
      code: 'TOTAL_AREA_ZERO',
      messageDe: 'Gesamtfläche muss größer als 0 sein.',
      severity: 'error',
      scope: 'abrechnung',
    });
  }

  if (a.units.length === 0) {
    issues.push({
      code: 'NO_UNITS',
      messageDe: 'Keine Einheiten vorhanden.',
      severity: 'error',
      scope: 'abrechnung',
    });
  }

  if (a.property.numberOfUnits <= 0) {
    issues.push({
      code: 'NO_UNITS_COUNT',
      messageDe: 'Anzahl der Einheiten muss größer als 0 sein.',
      severity: 'error',
      scope: 'abrechnung',
    });
  }

  for (const unit of a.units) {
    if (unit.areaSqm <= 0) {
      issues.push({
        code: 'UNIT_AREA_ZERO',
        messageDe: 'Einheit hat keine gültige Fläche.',
        severity: 'error',
        scope: 'unit',
        refId: unit.id,
      });
    }
  }

  for (const cp of a.costPositions) {
    if (cp.totalCents < 0) {
      issues.push({
        code: 'NEGATIVE_COST',
        messageDe: 'Kosten dürfen nicht negativ sein.',
        severity: 'error',
        scope: 'costPosition',
        refId: cp.id,
      });
    }

    if (
      cp.allocationKey.type === 'verbrauch' &&
      cp.consumptionTenantValue !== undefined &&
      cp.consumptionTotalValue !== undefined &&
      cp.consumptionTenantValue > cp.consumptionTotalValue
    ) {
      issues.push({
        code: 'CONSUMPTION_EXCEEDS_TOTAL',
        messageDe: 'Verbrauchsanteil überschreitet Gesamtverbrauch.',
        severity: 'error',
        scope: 'costPosition',
        refId: cp.id,
      });
    }
  }

  // WARNINGS
  if (a.billingPeriod) {
    const months = monthsBetween(a.billingPeriod.startDate, a.billingPeriod.endDate);
    if (months > 12) {
      issues.push({
        code: 'PERIOD_OVER_12_MONTHS',
        messageDe: 'Abrechnungszeitraum überschreitet 12 Monate.',
        severity: 'warning',
        scope: 'abrechnung',
      });
    }
  }

  if (a.costPositions.length === 0) {
    issues.push({
      code: 'NO_COST_POSITIONS',
      messageDe: 'Keine Kostenpositionen vorhanden.',
      severity: 'warning',
      scope: 'abrechnung',
    });
  }

  for (const t of a.tenancies) {
    if (t.monthlyPrepaymentCents === 0) {
      issues.push({
        code: 'PREPAYMENT_ZERO',
        messageDe: 'Vorauszahlung ist 0 €.',
        severity: 'warning',
        scope: 'tenancy',
        refId: t.id,
      });
    }
  }

  for (const cp of a.costPositions) {
    const category = COST_CATEGORIES[cp.categoryKey];
    if (!category) continue;

    if (category.status === 'warn') {
      issues.push({
        code: 'WARN_CATEGORY_PRESENT',
        messageDe: `Kostenkategorie „${category.labelDe}" erfordert besondere Prüfung.`,
        severity: 'warning',
        scope: 'costPosition',
        refId: cp.id,
      });
    }

    if (category.status === 'blocked') {
      issues.push({
        code: 'BLOCKED_CATEGORY_PRESENT',
        messageDe: `Kostenkategorie „${category.labelDe}" ist laut BetrKV nicht umlagefähig. Bitte prüfen.`,
        severity: 'warning',
        scope: 'costPosition',
        refId: cp.id,
      });
    }

    if (cp.allocationKey.type === 'manuell') {
      issues.push({
        code: 'MANUAL_ALLOCATION_KEY',
        messageDe: 'Manueller Umlageschlüssel verwendet. Bitte Prozentsatz prüfen.',
        severity: 'warning',
        scope: 'costPosition',
        refId: cp.id,
      });
    }
  }

  const hasHeizkosten = a.costPositions.some(
    (cp) => cp.categoryKey === 'heizung' || cp.categoryKey === 'warmwasser',
  );
  if (hasHeizkosten) {
    issues.push({
      code: 'HEIZKOSTEN_HKVO',
      messageDe: 'Heizkostenverordnung prüfen: mind. 50–70 % verbrauchsabhängig.',
      severity: 'warning',
      scope: 'abrechnung',
    });
  }

  return issues;
}
