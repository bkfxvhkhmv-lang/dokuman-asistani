import type { HighlightRule } from './types';

export const HIGHLIGHT_RULES: HighlightRule[] = [
  { key: 'frist',  regex: /(?:bis(?:\s+zum?)?|[Ff]rist[:\s]+|spätestens|zahlbar bis)\s+\d{1,2}\.\d{1,2}\.\d{2,4}/g, color: '#DC2626', bg: '#FEE2E2', label: 'Frist',  neon: '#EF4444' },
  { key: 'iban',   regex: /DE\d{2}[\s\d]{15,25}/g,                                                                   color: '#D97706', bg: '#FEF3C7', label: 'IBAN',   neon: '#F59E0B' },
  { key: 'amount', regex: /\b\d{1,6}[.,]\d{2}\s*€|€\s*\d{1,6}[.,]\d{2}/g,                                          color: '#16A34A', bg: '#DCFCE7', label: '€',      neon: '#22C55E' },
  { key: 'date',   regex: /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g,                                                         color: '#2563EB', bg: '#DBEAFE', label: 'Datum',  neon: '#3B82F6' },
  { key: 'email',  regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,                                     color: '#7C3AED', bg: '#EDE9FE', label: 'E-Mail', neon: '#8B5CF6' },
  { key: 'az',     regex: /Az\.?\s*:?\s*[A-Z0-9][\w/\-]{2,}/g,                                                      color: '#64748B', bg: '#F1F5F9', label: 'Az.',    neon: '#94A3B8' },
];
