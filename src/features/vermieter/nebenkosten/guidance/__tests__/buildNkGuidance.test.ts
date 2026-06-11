/**
 * D-3.2b — Guidance Layer Tests
 *
 * Pure function tests. No React, no UI, no calculation.
 */

import type { ValidationIssue, UnitCalculationResult } from '@/features/vermieter/nebenkosten/domain';
import {
  buildNkGuidance,
  warningMessageForRole,
  nextStepsForRole,
} from '@/features/vermieter/nebenkosten/guidance';
import type { NkRole } from '@/features/vermieter/nebenkosten/guidance';

function makeIssue(overrides: Partial<ValidationIssue> & { code: string }): ValidationIssue {
  return {
    messageDe: 'Testmeldung',
    severity: 'warning',
    scope: 'abrechnung',
    ...overrides,
  };
}

const makeResult = (overrides?: Partial<UnitCalculationResult>): UnitCalculationResult =>
  ({
    unit: { id: 'unit-1', propertyId: 'prop-1', label: 'EG', areaSqm: 60 },
    tenancy: {
      id: 'tenancy-1',
      unitId: 'unit-1',
      tenant: { id: 'tenant-1', name: 'Müller' },
      startDate: '2024-01-01',
      numberOfPersons: 2,
      monthlyPrepaymentCents: 15000,
    },
    billingPeriod: { startDate: '2024-01-01', endDate: '2024-12-31' },
    lineItems: [],
    sumTenantCostsCents: 0,
    prepaymentTotalCents: 180000,
    differenceCents: -180000,
    resultType: 'guthaben',
    ...overrides,
  }) as UnitCalculationResult;

describe('buildNkGuidance', () => {
  it('returns empty guidance for empty input', () => {
    const result = buildNkGuidance('mieter', []);
    expect(result.role).toBe('mieter');
    expect(result.items).toEqual([]);
    expect(result.hasBlockingErrors).toBe(false);
    expect(result.results).toBeUndefined();
  });

  it('preserves results when provided', () => {
    const results = [makeResult()];
    const result = buildNkGuidance('vermieter', [], results);
    expect(result.results).toBe(results);
  });

  it('maps a validation issue to a guidance item', () => {
    const issue = makeIssue({ code: 'NO_COST_POSITIONS', severity: 'warning' });
    const result = buildNkGuidance('mieter', [issue]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].code).toBe('NO_COST_POSITIONS');
    expect(result.items[0].severity).toBe('warning');
    expect(result.items[0].messageDe).toBeTruthy();
    expect(result.items[0].nextStepsDe.length).toBeGreaterThan(0);
  });

  it('passes severity through unchanged', () => {
    const errorIssue = makeIssue({ code: 'TOTAL_AREA_ZERO', severity: 'error' });
    const warningIssue = makeIssue({ code: 'PERIOD_OVER_12_MONTHS', severity: 'warning' });
    const infoIssue = makeIssue({ code: 'ABRECHNUNGSFRIST_HINWEIS', severity: 'info' });

    const result = buildNkGuidance('vermieter', [errorIssue, warningIssue, infoIssue]);
    expect(result.items[0].severity).toBe('error');
    expect(result.items[1].severity).toBe('warning');
    expect(result.items[2].severity).toBe('info');
  });

  it('sets hasBlockingErrors true when an error issue exists', () => {
    const issue = makeIssue({ code: 'NEGATIVE_COST', severity: 'error' });
    const result = buildNkGuidance('vermieter', [issue]);
    expect(result.hasBlockingErrors).toBe(true);
  });

  it('does not mutate input issues', () => {
    const issue = makeIssue({ code: 'NO_COST_POSITIONS', severity: 'warning' });
    const snapshot = JSON.stringify(issue);
    buildNkGuidance('mieter', [issue]);
    expect(JSON.stringify(issue)).toBe(snapshot);
  });

  it('does not crash on unknown issue codes', () => {
    const issue = makeIssue({ code: 'UNKNOWN_FUTURE_CODE', severity: 'warning' });
    const result = buildNkGuidance('mieter', [issue]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].messageDe).toBe('Testmeldung');
    expect(result.items[0].nextStepsDe.length).toBeGreaterThan(0);
  });

  describe('role differentiation', () => {
    it('HEIZKOSTEN_HKVO produces different text for mieter and vermieter', () => {
      const issue = makeIssue({ code: 'HEIZKOSTEN_HKVO', severity: 'warning' });
      const mieter = buildNkGuidance('mieter', [issue]).items[0];
      const vermieter = buildNkGuidance('vermieter', [issue]).items[0];
      expect(mieter.messageDe).not.toBe(vermieter.messageDe);
      expect(mieter.messageDe.toLowerCase()).toContain('ihre abrechnung');
      expect(vermieter.messageDe.toLowerCase()).toContain('widerspruchsrisiko');
    });

    it('BLOCKED_CATEGORY_PRESENT produces different text for mieter and vermieter', () => {
      const issue = makeIssue({ code: 'BLOCKED_CATEGORY_PRESENT', severity: 'warning' });
      const mieter = buildNkGuidance('mieter', [issue]).items[0];
      const vermieter = buildNkGuidance('vermieter', [issue]).items[0];
      expect(mieter.messageDe).not.toBe(vermieter.messageDe);
      expect(mieter.messageDe.toLowerCase()).toContain('nicht auf sie umgelegt');
      expect(vermieter.messageDe.toLowerCase()).toContain('ausgeschlossen');
    });

    it('BLOCKED_CATEGORY_INCLUDED emits error severity for both roles', () => {
      const issue = makeIssue({ code: 'BLOCKED_CATEGORY_INCLUDED', severity: 'error' });
      const mieter = buildNkGuidance('mieter', [issue]).items[0];
      const vermieter = buildNkGuidance('vermieter', [issue]).items[0];
      expect(mieter.severity).toBe('error');
      expect(vermieter.severity).toBe('error');
      expect(mieter.messageDe).not.toBe(vermieter.messageDe);
    });
  });

  describe('next steps', () => {
    it('provides mieter-specific next steps', () => {
      const issue = makeIssue({ code: 'BLOCKED_CATEGORY_INCLUDED', severity: 'warning' });
      const result = buildNkGuidance('mieter', [issue]);
      expect(result.items[0].nextStepsDe).toEqual(
        expect.arrayContaining([expect.stringContaining('Belegeinsicht')]),
      );
    });

    it('provides vermieter-specific next steps', () => {
      const issue = makeIssue({ code: 'BLOCKED_CATEGORY_INCLUDED', severity: 'warning' });
      const result = buildNkGuidance('vermieter', [issue]);
      expect(result.items[0].nextStepsDe).toEqual(
        expect.arrayContaining([expect.stringContaining('Umlageschlüssel')]),
      );
    });
  });

  describe('warningMessageForRole', () => {
    it('falls back to domain message for unknown codes', () => {
      const issue = makeIssue({ code: 'UNKNOWN_CODE', messageDe: 'Domain message' });
      expect(warningMessageForRole('mieter', issue)).toBe('Domain message');
    });
  });

  describe('nextStepsForRole', () => {
    it('falls back to generic next steps for unknown codes', () => {
      const issue = makeIssue({ code: 'UNKNOWN_CODE' });
      const steps = nextStepsForRole('vermieter', issue);
      expect(steps.length).toBeGreaterThan(0);
    });
  });
});
