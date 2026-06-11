/**
 * D-3.0 — Currency Utilities
 *
 * Euro-cent arithmetic helpers. No floating-point money in stored values.
 */

import type { EuroCents } from './types';

export function formatEuro(cents: EuroCents): string {
  const euros = cents / 100;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(euros);
}

export function formatPercent(value: number): string {
  const pct = value * 100;
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pct) + ' %';
}

export function centsFromEuro(euros: number): EuroCents {
  return Math.round(euros * 100);
}

export function euroFromCents(cents: EuroCents): number {
  return cents / 100;
}
