/**
 * D-3.0 — Calculation Engine
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
} from './types';
import { COST_CATEGORIES } from './costCategories';
import { computeSharePercent } from './allocationEngine';

function monthsBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  const totalMonths = years * 12 + months + 1;
  return Math.max(0, totalMonths);
}

function computePrepaymentTotalCents(
  tenancy: Tenancy,
  billingPeriod: BillingPeriod,
): number {
  const months = monthsBetween(billingPeriod.startDate, billingPeriod.endDate);
  // TODO D-3.1: partial period pro-rata not yet implemented
  return months * tenancy.monthlyPrepaymentCents;
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

  const tenantShareCents = Math.round(sharePercent * costPosition.totalCents);

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
    (sum, item) => sum + item.tenantShareCents,
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
