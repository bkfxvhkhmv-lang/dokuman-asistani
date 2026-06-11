/**
 * D-3.0 / D-3.1b — Calculation Engine
 *
 * Computes tenant shares, prepayments, and differences.
 */

import type {
  CostPosition,
  Unit,
  Property,
  Tenancy,
  BillingPeriod,
  CalculationLineItem,
  UnitCalculationResult,
  NebenkostenAbrechnung,
  EuroCents,
} from './types';
import { COST_CATEGORIES } from './costCategories';
import { computeSharePercent } from './allocationEngine';

function parseISODate(iso: string): { year: number; month: number; day: number } {
  const [yearStr, monthStr, dayStr] = iso.split('-');
  return {
    year: Number(yearStr),
    month: Number(monthStr),
    day: Number(dayStr),
  };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      throw new Error(`Invalid month: ${month}`);
  }
}

function dateKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function compareDates(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number },
): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

export function computePrepaymentTotalCents(
  tenancy: Tenancy,
  billingPeriod: BillingPeriod,
): EuroCents {
  const start = parseISODate(tenancy.startDate);
  const end = tenancy.endDate ? parseISODate(tenancy.endDate) : null;
  const periodStart = parseISODate(billingPeriod.startDate);
  const periodEnd = parseISODate(billingPeriod.endDate);

  const effectiveStart = compareDates(start, periodStart) > 0 ? start : periodStart;
  const effectiveEndCandidate = end ?? periodEnd;
  const effectiveEnd =
    compareDates(effectiveEndCandidate, periodEnd) < 0
      ? effectiveEndCandidate
      : periodEnd;

  if (compareDates(effectiveStart, effectiveEnd) > 0) {
    return 0;
  }

  let total = 0;
  let currentYear = effectiveStart.year;
  let currentMonth = effectiveStart.month;

  while (true) {
    const currentEndDay = daysInMonth(currentYear, currentMonth);
    const isStartMonth =
      currentYear === effectiveStart.year && currentMonth === effectiveStart.month;
    const isEndMonth =
      currentYear === effectiveEnd.year && currentMonth === effectiveEnd.month;

    const startDay = isStartMonth ? effectiveStart.day : 1;
    const endDay = isEndMonth ? effectiveEnd.day : currentEndDay;
    const activeDays = endDay - startDay + 1;

    const ratio = activeDays / currentEndDay;
    total += Math.round(tenancy.monthlyPrepaymentCents * ratio);

    if (isEndMonth) break;

    currentMonth += 1;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear += 1;
    }
  }

  return total;
}

export function calculateLineItem(
  costPosition: CostPosition,
  unit: Unit,
  property: Property,
  activeTenanciesInPeriod: Tenancy[],
  tenancy: Tenancy,
): CalculationLineItem {
  const category = COST_CATEGORIES[costPosition.categoryKey];
  const categoryStatus = category?.status ?? 'allocable';

  const sharePercent = computeSharePercent({
    key: costPosition.allocationKey,
    unit,
    property,
    tenancy,
    activeTenanciesInPeriod,
    consumptionTenantValue: costPosition.consumptionTenantValue,
    consumptionTotalValue: costPosition.consumptionTotalValue,
  });

  const tenantShareCents = costPosition.includeInCalculation
    ? Math.round(sharePercent * costPosition.totalCents)
    : 0;

  return {
    costPosition,
    sharePercent,
    tenantShareCents,
    categoryStatus,
  };
}

export function calculateUnitResult(
  abrechnung: NebenkostenAbrechnung,
  unit: Unit,
  tenancy: Tenancy,
): UnitCalculationResult {
  const { property, billingPeriod, costPositions, tenancies } = abrechnung;

  const activeTenanciesInPeriod = tenancies.filter(
    (t) => t.unitId === unit.id,
  );

  const lineItems = costPositions
    .filter((cp) => {
      if (cp.scope === 'property') return true;
      return cp.scope === 'unit' && cp.unitId === unit.id;
    })
    .map((cp) =>
      calculateLineItem(cp, unit, property, activeTenanciesInPeriod, tenancy),
    );

  const sumTenantCostsCents = lineItems.reduce(
    (sum, item) =>
      item.costPosition.includeInCalculation ? sum + item.tenantShareCents : sum,
    0,
  );

  const prepaymentTotalCents = computePrepaymentTotalCents(tenancy, billingPeriod);

  const differenceCents = sumTenantCostsCents - prepaymentTotalCents;

  let resultType: UnitCalculationResult['resultType'];
  if (differenceCents > 0) resultType = 'nachzahlung';
  else if (differenceCents < 0) resultType = 'guthaben';
  else resultType = 'ausgeglichen';

  return {
    unit,
    tenancy,
    billingPeriod,
    lineItems,
    sumTenantCostsCents,
    prepaymentTotalCents,
    differenceCents,
    resultType,
  };
}

export function calculateAbrechnung(
  abrechnung: NebenkostenAbrechnung,
): UnitCalculationResult[] {
  return abrechnung.units.map((unit) => {
    const tenancy = abrechnung.tenancies.find((t) => t.unitId === unit.id);
    if (!tenancy) {
      throw new Error(`Kein Mietverhältnis für Einheit ${unit.id} gefunden.`);
    }
    return calculateUnitResult(abrechnung, unit, tenancy);
  });
}
