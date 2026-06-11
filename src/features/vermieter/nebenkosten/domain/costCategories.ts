/**
 * D-3.0 — Cost Categories (BetrKV)
 *
 * No legal validity claim. This is a Rechen- und Strukturhilfe.
 */

import type { CostCategory } from './types';

export const COST_CATEGORIES: Record<string, CostCategory> = {
  // ALLOCABLE (umlagefähig)
  grundsteuer: {
    key: 'grundsteuer',
    labelDe: 'Grundsteuer',
    status: 'allocable',
    defaultAllocationKey: 'wohnflaeche',
    betrkvRef: '§2 Nr. 1 BetrKV',
  },
  wasserversorgung: {
    key: 'wasserversorgung',
    labelDe: 'Wasserversorgung',
    status: 'allocable',
    defaultAllocationKey: 'wohnflaeche',
    betrkvRef: '§2 Nr. 2',
  },
  entwaesserung: {
    key: 'entwaesserung',
    labelDe: 'Entwässerung',
    status: 'allocable',
    defaultAllocationKey: 'wohnflaeche',
    betrkvRef: '§2 Nr. 3',
  },
  aufzug: {
    key: 'aufzug',
    labelDe: 'Aufzug',
    status: 'allocable',
    defaultAllocationKey: 'wohneinheit',
    betrkvRef: '§2 Nr. 7',
  },
  strassenreinigung: {
    key: 'strassenreinigung',
    labelDe: 'Straßenreinigung / Winterdienst',
    status: 'allocable',
    defaultAllocationKey: 'wohnflaeche',
    betrkvRef: '§2 Nr. 8',
  },
  muellbeseitigung: {
    key: 'muellbeseitigung',
    labelDe: 'Müllbeseitigung',
    status: 'allocable',
    defaultAllocationKey: 'wohneinheit',
    betrkvRef: '§2 Nr. 8',
  },
  gebaeudereinigung: {
    key: 'gebaeudereinigung',
    labelDe: 'Gebäudereinigung',
    status: 'allocable',
    defaultAllocationKey: 'wohneinheit',
    betrkvRef: '§2 Nr. 9',
  },
  gartenpflege: {
    key: 'gartenpflege',
    labelDe: 'Gartenpflege',
    status: 'allocable',
    defaultAllocationKey: 'wohnflaeche',
    betrkvRef: '§2 Nr. 10',
  },
  beleuchtung: {
    key: 'beleuchtung',
    labelDe: 'Beleuchtung',
    status: 'allocable',
    defaultAllocationKey: 'wohneinheit',
    betrkvRef: '§2 Nr. 11',
  },
  schornstein: {
    key: 'schornstein',
    labelDe: 'Schornsteinreinigung',
    status: 'allocable',
    defaultAllocationKey: 'wohneinheit',
    betrkvRef: '§2 Nr. 12',
  },
  versicherung: {
    key: 'versicherung',
    labelDe: 'Versicherungen',
    status: 'allocable',
    defaultAllocationKey: 'wohnflaeche',
    betrkvRef: '§2 Nr. 13',
  },
  kabel_internet: {
    key: 'kabel_internet',
    labelDe: 'Kabel- / Internetanschluss',
    status: 'allocable',
    defaultAllocationKey: 'wohneinheit',
    betrkvRef: '§2 Nr. 15',
  },

  // WARN (prüfen erforderlich)
  heizung: {
    key: 'heizung',
    labelDe: 'Heizkosten',
    status: 'warn',
    defaultAllocationKey: 'verbrauch',
    warningDe:
      'Heizkostenverordnung beachten: mind. 50–70 % verbrauchsabhängig abrechnen. Bitte prüfen.',
  },
  warmwasser: {
    key: 'warmwasser',
    labelDe: 'Warmwasser (zentral)',
    status: 'warn',
    defaultAllocationKey: 'verbrauch',
    warningDe:
      'Heizkostenverordnung beachten: mind. 50–70 % verbrauchsabhängig abrechnen. Bitte prüfen.',
  },
  hauswart: {
    key: 'hauswart',
    labelDe: 'Hauswart / Hausmeister',
    status: 'warn',
    defaultAllocationKey: 'wohnflaeche',
    warningDe:
      'Nur umlagefähige Tätigkeiten; Instandhaltungsanteil nicht umlegbar. Bitte prüfen.',
  },
  sonstige: {
    key: 'sonstige',
    labelDe: 'Sonstige Betriebskosten',
    status: 'warn',
    defaultAllocationKey: 'wohnflaeche',
    warningDe:
      'Nur vertraglich vereinbarte und tatsächlich angefallene Kosten. Bitte prüfen.',
  },

  // BLOCKED (nicht umlagefähig — mit roter Warnung markieren)
  reparaturen: {
    key: 'reparaturen',
    labelDe: 'Reparaturen / Instandhaltung',
    status: 'blocked',
    defaultAllocationKey: 'wohnflaeche',
    warningDe:
      'Nicht umlagefähig laut BetrKV. Wird mit roter Warnung markiert; Nutzer muss vor Versand prüfen.',
  },
  verwaltung: {
    key: 'verwaltung',
    labelDe: 'Verwaltungskosten',
    status: 'blocked',
    defaultAllocationKey: 'wohnflaeche',
    warningDe:
      'Nicht umlagefähig laut BetrKV. Wird mit roter Warnung markiert; Nutzer muss vor Versand prüfen.',
  },
  bankgebuehren: {
    key: 'bankgebuehren',
    labelDe: 'Bankgebühren',
    status: 'blocked',
    defaultAllocationKey: 'wohnflaeche',
    warningDe:
      'Nicht umlagefähig laut BetrKV. Wird mit roter Warnung markiert; Nutzer muss vor Versand prüfen.',
  },
  mietausfall: {
    key: 'mietausfall',
    labelDe: 'Mietausfallwagnis',
    status: 'blocked',
    defaultAllocationKey: 'wohnflaeche',
    warningDe:
      'Nicht umlagefähig laut BetrKV. Wird mit roter Warnung markiert; Nutzer muss vor Versand prüfen.',
  },
  privat: {
    key: 'privat',
    labelDe: 'Private Kosten',
    status: 'blocked',
    defaultAllocationKey: 'wohnflaeche',
    warningDe:
      'Nicht umlagefähig. Wird mit roter Warnung markiert; Nutzer muss vor Versand prüfen.',
  },
};
