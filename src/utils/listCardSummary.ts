import type { Dokument } from '@/store';

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
