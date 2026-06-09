import type { Slide } from '@/components/onboarding/onboarding.types';

export const ONBOARDING_SLIDES: Slide[] = [
  {
    id: 'welcome', emoji: '📄', titel: 'Willkommen bei BriefPilot', farbe: '#534AB7', demo: null,
    text: 'Ihre KI-Assistentin für Briefe, Rechnungen und Behördendokumente.\nNie wieder wichtige Fristen verpassen.',
  },
  {
    id: 'scan', emoji: '📷', titel: 'Dokument scannen', farbe: '#7C6EF8',
    text: 'Einfach fotografieren — BriefPilot erkennt Typ, Betrag, Frist und IBAN automatisch.',
    demo: {
      type: 'scan',
      schritte: [
        { icon: '📷', label: 'Foto aufnehmen', desc: 'Kamera öffnen, Dokument fotografieren' },
        { icon: '🔍', label: 'KI erkennt Inhalt', desc: 'Betrag, Frist, Typ automatisch erkannt' },
        { icon: '✅', label: 'Gespeichert!', desc: 'Mit Erinnerung & Risikoanalyse' },
      ],
    },
  },
  {
    id: 'risiko', emoji: '🎯', titel: 'Automatische Risikoanalyse', farbe: '#E24B4A',
    text: 'Jedes Dokument bekommt eine Dringlichkeitsstufe — damit Sie sofort sehen, was zuerst wichtig ist.',
    demo: {
      type: 'risiko',
      beispiele: [
        { risiko: 'hoch', label: '🔴 Dringend', farbe: '#E24B4A', titel: 'Bußgeldbescheid · 48,50 €', tage: '2 Tage' },
        { risiko: 'mittel', label: '🟡 Diese Woche', farbe: '#BA7517', titel: 'Finanzamt · 312,00 €', tage: '5 Tage' },
        { risiko: 'niedrig', label: '🟢 Kein Handlungsbedarf', farbe: '#1D9E75', titel: 'Vodafone Rechnung · 89,95 €', tage: '12 Tage' },
      ],
    },
  },
  {
    id: 'fristen', emoji: '⏰', titel: 'Fristen nie vergessen', farbe: '#BA7517',
    text: 'Automatische Erinnerungen 3 Tage und 1 Tag vor Ablauf. Einspruchsfristen werden direkt berechnet.',
    demo: {
      type: 'fristen',
      events: [
        { datum: 'Mi, 16. Apr', titel: 'Bußgeld Zahlung', tage: 0, risiko: 'hoch' },
        { datum: 'Fr, 18. Apr', titel: 'Finanzamt Frist', tage: 2, risiko: 'mittel' },
        { datum: 'So, 20. Apr', titel: 'Vodafone SEPA', tage: 4, risiko: 'niedrig' },
      ],
    },
  },
  {
    id: 'suche', emoji: '🔍', titel: 'Intelligente Suche', farbe: '#1D9E75',
    text: 'Suchen Sie in natürlicher Sprache — „über 100€ diese Woche" oder „überfällige Mahnungen".',
    demo: {
      type: 'suche',
      beispiele: ['"über 100€"', '"diese Woche fällig"', '"überfällig"', '"Bußgeld 2026"'],
    },
  },
  {
    id: 'privat', emoji: '🔒', titel: 'Sicher & privat', farbe: '#2C6FAC',
    textKey: 'onboarding.privacy.body',
    demo: {
      type: 'privat',
      punkte: [
        { icon: '⚠️', textKey: 'onboarding.privacy.device_loss' },
        { icon: '☁️', textKey: 'onboarding.privacy.cloud_optional' },
      ],
    },
  },
];
