import type { Dokument } from '@/store';

/**
 * Returns a compact, actionable one-liner for the document list card.
 * Only returns a string when real structured data (betrag/frist) is available.
 * Returns null for missing-data cases — caller falls back to listSnippet or renders nothing.
 */
export function buildCardInsight(
  dok: Pick<Dokument, 'betrag' | 'frist' | 'erledigt'>,
): string | null {
  if (dok.erledigt) return null;

  const hasBetrag = typeof dok.betrag === 'number' && dok.betrag > 0;
  const betragStr = hasBetrag
    ? new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(dok.betrag!) + ' €'
    : null;

  const fristDate = dok.frist ? new Date(dok.frist) : null;
  const hasFrist = fristDate !== null && !Number.isNaN(fristDate.getTime());
  const fristStr = hasFrist
    ? fristDate!.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  if (betragStr && fristStr) return `${betragStr} · Zahlung bis ${fristStr}`;
  if (betragStr) return `${betragStr} · Frist prüfen`;
  if (fristStr) return `Frist bis ${fristStr}`;

  return null;
}

/**
 * Liste kartında uzun yapılandırılmış özet yerine okunaklı bir metin.
 * Yerel `erstelleZusammenfassung` ve KI özetleri “Dokumenttyp / Absender …” ile başlayabiliyor;
 * iki satırda sadece başlık + "…" görünmesini önler.
 */
export function excerptForDocumentListCard(
  dok: Pick<Dokument, 'kurzfassung' | 'zusammenfassung'>,
): string | null {
  const kurz = dok.kurzfassung?.trim();
  if (kurz) return kurz;

  const raw = dok.zusammenfassung?.trim();
  if (!raw) return null;

  const reco = raw.match(/(?:📌\s*)?Empfehlung:\s*([\s\S]+)/i);
  if (reco) {
    const one = reco[1].replace(/\s+/g, ' ').trim();
    if (one.length >= 8) return one;
  }

  const chunks = raw.split(/\n\n+/).map(c => c.trim()).filter(Boolean);
  const metaLine = /^(Dokumenttyp:|👤\s*Absender:|💰\s*Betrag:|Betrag:|Frist:|🔢\s*Rechnungsnummer:)/i;
  const rest = chunks
    .filter(c => {
      const first = c.split('\n')[0]?.trim() ?? c;
      return !metaLine.test(first);
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (rest.length >= 12) return rest;

  const collapsed = raw.replace(/\s+/g, ' ').trim();
  return collapsed.length > 0 ? collapsed : null;
}
