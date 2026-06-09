import type { Dokument } from '@/store/types';
import { erstelleKurzfassung } from '@/services/vision-api/summarizeText';

/**
 * Kernfelder (Typ, Betrag, Frist, Absender) güncellenince Liste/Arama senkronu für `kurzfassung`.
 * Explizit gesetztes `kurzfassung` im Payload bleibt unangetastet.
 */
export function followKurzfassungMitKernfeldern(
  prev: Dokument,
  merged: Dokument,
  rawPayload: Partial<Dokument> & { id: string },
): Pick<Dokument, 'kurzfassung'> | null {
  if (Object.prototype.hasOwnProperty.call(rawPayload, 'kurzfassung')) return null;

  const keys: (keyof Dokument)[] = ['typ', 'betrag', 'frist', 'absender'];
  const changed = keys.some(k => {
    if (rawPayload[k] === undefined) return false;
    return rawPayload[k] !== prev[k];
  });
  if (!changed) return null;

  const k = erstelleKurzfassung(
    String(merged.typ || 'Sonstiges'),
    merged.betrag ?? null,
    merged.frist ?? null,
    String(merged.absender || 'Unbekannter Absender'),
  );
  return { kurzfassung: k };
}
