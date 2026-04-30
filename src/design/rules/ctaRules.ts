export type CtaPriority =
  | 'critical_payment'
  | 'critical_deadline'
  | 'document_decision'
  | 'scan'
  | 'secondary'
  | 'none';

const CTA_ORDER: CtaPriority[] = [
  'critical_payment',
  'critical_deadline',
  'document_decision',
  'scan',
  'secondary',
];

export function shouldShowPrimaryCta(active: CtaPriority[]): CtaPriority {
  return CTA_ORDER.find(priority => active.includes(priority)) ?? 'none';
}
