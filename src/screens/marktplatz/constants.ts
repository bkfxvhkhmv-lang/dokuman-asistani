export const KATEGORIEN = ['alle', 'financial', 'legal', 'tax', 'insurance', 'reminder', 'relation'] as const;

export const KAT_LABELS: Record<string, string> = {
  alle: 'Alle',
  financial: 'Finanzen',
  legal: 'Recht',
  tax: 'Steuer',
  insurance: 'Versicherung',
  reminder: 'Erinnerung',
  relation: 'Beziehung',
};

export const KAT_COLORS: Record<string, string> = {
  alle: '#78909C',
  financial: '#4A90D9',
  legal: '#7B6FD4',
  tax: '#9B6BBE',
  insurance: '#4DA8A0',
  reminder: '#C49040',
  relation: '#C4706A',
};
