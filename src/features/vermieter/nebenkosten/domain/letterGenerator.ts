/**
 * D-3.0 / D-3.1b — Letter Generator
 *
 * Plain-text draft for Nebenkostenabrechnung.
 * ≤ 80 lines, no HTML, no Markdown.
 */

import type { UnitCalculationResult, NebenkostenAbrechnung, Landlord } from './types';
import { formatEuro, formatPercent } from './currencyUtils';
import { COST_CATEGORIES } from './costCategories';

function formatAddress(addr: { street: string; houseNumber: string; postalCode: string; city: string }): string {
  return `${addr.street} ${addr.houseNumber}\n${addr.postalCode} ${addr.city}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function generateLetterDraft(
  result: UnitCalculationResult,
  abrechnung: NebenkostenAbrechnung,
  landlord: Landlord,
): string {
  const tenant = result.tenancy.tenant;
  const property = abrechnung.property;
  const period = result.billingPeriod;

  const year = period.startDate.split('-')[0];
  const resultLabel =
    result.resultType === 'nachzahlung'
      ? 'Nachzahlung'
      : result.resultType === 'guthaben'
        ? 'Guthaben'
        : 'Ausgeglichen';

  const lines: string[] = [
    `${landlord.name}\n${formatAddress(landlord.address)}`,
    `\n${tenant.name}${tenant.address ? '\n' + formatAddress(tenant.address) : ''}`,
    `\nNebenkostenabrechnung ${year}`,
    `Objekt: ${formatAddress(property.address)}`,
    `Einheit: ${result.unit.label}`,
    `Abrechnungszeitraum: ${formatDate(period.startDate)} – ${formatDate(period.endDate)}`,
    '\nKOSTENPOSITIONEN',
    '-------------------------------',
  ];

  for (const item of result.lineItems) {
    const cat = COST_CATEGORIES[item.costPosition.categoryKey];
    const label = cat?.labelDe ?? item.costPosition.descriptionDe;
    const excludedNote = item.costPosition.includeInCalculation
      ? ''
      : ' (nicht umlagefähig laut BetrKV — nicht einbezogen)';
    lines.push(
      `${label.padEnd(28)} ${formatPercent(item.sharePercent).padStart(8)}    ${formatEuro(item.tenantShareCents).padStart(12)}${excludedNote}`,
    );
  }

  lines.push(
    '-------------------------------',
    `Summe Nebenkosten:          ${formatEuro(result.sumTenantCostsCents).padStart(12)}`,
    `Geleistete Vorauszahlungen: ${formatEuro(result.prepaymentTotalCents).padStart(12)}`,
    '-------------------------------',
    `${resultLabel}: ${formatEuro(Math.abs(result.differenceCents)).padStart(12)}`,
    '\nBelegeinsicht: Die Belege zu dieser Abrechnung stehen Ihnen auf Anfrage zur Einsicht bereit.',
    '\n---',
    'Dieser Entwurf wurde mit BriefPilot als Rechen- und Strukturhilfe erstellt.',
    'Er ersetzt keine rechtliche Beratung.',
    'Bitte prüfen Sie alle Angaben, Umlageschlüssel, Belege und Fristen vor dem Versand.',
  );

  return lines.join('\n');
}
