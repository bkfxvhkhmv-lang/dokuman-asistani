/**
 * D-3.0 — Allocation Engine
 *
 * Computes tenant share percentages per allocation key.
 */

import type { AllocationKey, Unit, Property, Tenancy } from './types';
import { AllocationError } from './types';

export interface AllocationInput {
  key: AllocationKey;
  unit: Unit;
  property: Property;
  tenancy: Tenancy;
  activeTenanciesInPeriod: Tenancy[];
  consumptionTenantValue?: number;
  consumptionTotalValue?: number;
}

export function computeSharePercent(input: AllocationInput): number {
  const { key, unit, property, tenancy, activeTenanciesInPeriod } = input;

  switch (key.type) {
    case 'wohnflaeche': {
      if (property.totalAreaSqm <= 0) {
        throw new AllocationError('ZERO_DENOMINATOR', 'Gesamtfläche ist 0.');
      }
      if (unit.areaSqm < 0) {
        throw new AllocationError('NEGATIVE_VALUE', 'Wohnfläche darf nicht negativ sein.');
      }
      return unit.areaSqm / property.totalAreaSqm;
    }

    case 'personen': {
      // MVP: numberOfPersons is treated as static for the entire billing period.
      // Mid-period person count changes are not supported.
      // See NK compliance matrix Karar 3.
      const totalPersons = activeTenanciesInPeriod.reduce(
        (sum: number, t: Tenancy) => sum + t.numberOfPersons,
        0,
      );
      if (totalPersons <= 0) {
        throw new AllocationError('ZERO_DENOMINATOR', 'Gesamtpersonenzahl ist 0.');
      }
      if (tenancy.numberOfPersons < 0) {
        throw new AllocationError('NEGATIVE_VALUE', 'Personenzahl darf nicht negativ sein.');
      }
      return tenancy.numberOfPersons / totalPersons;
    }

    case 'wohneinheit': {
      if (property.numberOfUnits <= 0) {
        throw new AllocationError('ZERO_DENOMINATOR', 'Anzahl der Einheiten ist 0.');
      }
      return 1 / property.numberOfUnits;
    }

    case 'verbrauch': {
      const { consumptionTenantValue, consumptionTotalValue } = input;
      if (consumptionTenantValue === undefined || consumptionTotalValue === undefined) {
        throw new AllocationError(
          'MISSING_CONSUMPTION',
          'Verbrauchswerte fehlen für verbrauchsabhängige Umlage.',
        );
      }
      if (consumptionTotalValue <= 0) {
        throw new AllocationError('ZERO_DENOMINATOR', 'Gesamtverbrauch ist 0.');
      }
      if (consumptionTenantValue < 0 || consumptionTotalValue < 0) {
        throw new AllocationError('NEGATIVE_VALUE', 'Verbrauchswerte dürfen nicht negativ sein.');
      }
      if (consumptionTenantValue > consumptionTotalValue) {
        throw new AllocationError(
          'CONSUMPTION_EXCEEDS_TOTAL',
          'Verbrauchsanteil überschreitet Gesamtverbrauch.',
        );
      }
      return consumptionTenantValue / consumptionTotalValue;
    }

    case 'direkt': {
      return 1;
    }

    case 'manuell': {
      if (key.manualPercent === undefined) {
        throw new AllocationError(
          'MISSING_MANUAL_PERCENT',
          'Manueller Umlageschlüssel ohne Prozentsatz.',
        );
      }
      if (key.manualPercent < 0 || key.manualPercent > 100) {
        throw new AllocationError(
          'INVALID_MANUAL_PERCENT',
          'Manueller Prozentsatz muss zwischen 0 und 100 liegen.',
        );
      }
      return key.manualPercent / 100;
    }

    default: {
      throw new AllocationError('UNKNOWN_KEY', `Unbekannter Umlageschlüssel: ${key.type}`);
    }
  }
}
