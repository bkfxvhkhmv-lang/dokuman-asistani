import type { RiskPalette } from '../theme';

export const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

export function getTageVerbleibend(fristISO: string | null | undefined): number | null {
  if (!fristISO) return null;
  return Math.ceil((new Date(fristISO).getTime() - Date.now()) / 86400000);
}

export function getTageText(fristISO: string | null | undefined): string | null {
  const t = getTageVerbleibend(fristISO);
  if (t === null) return null;
  if (t < 0) return 'Überfällig!';
  if (t === 0) return 'Heute fällig!';
  if (t === 1) return 'Morgen fällig';
  if (t <= 3) return `Noch ${t} Tage`;
  return `${t} Tage`;
}

export function formatBetrag(betrag: number | string | null | undefined, waehrung = '€'): string | null {
  if (betrag == null) return null;
  const n = typeof betrag === 'string' ? parseFloat(betrag) : betrag;
  if (isNaN(n)) return null;
  return `${n.toFixed(2).replace('.', ',')} ${waehrung}`;
}

export function formatDatum(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatFrist(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export interface RisikoInfo {
  color: string; bg: string; border: string; text: string; label: string;
}

export function getRisikoInfo(risiko: string | undefined, RiskColors?: RiskPalette): RisikoInfo {
  const fallback: Record<string, RisikoInfo> = {
    hoch:    { color: '#E24B4A', bg: '#FCEBEB', border: '#F09595', text: '#A32D2D', label: 'Dringend' },
    mittel:  { color: '#BA7517', bg: '#FAEEDA', border: '#EF9F27', text: '#633806', label: 'Diese Woche' },
    niedrig: { color: '#1D9E75', bg: '#EAF3DE', border: '#5DCAA5', text: '#27500A', label: 'Kein Handlungsbedarf' },
  };
  const palette = (RiskColors || fallback) as Record<string, RisikoInfo>;
  return palette[risiko ?? 'niedrig'] || palette['niedrig'];
}
