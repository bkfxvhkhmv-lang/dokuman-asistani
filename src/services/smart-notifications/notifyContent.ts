import type { Dokument } from '@/store';
import { formatBetrag, getTageVerbleibend } from '@/utils';
import { safeDisplayTitel } from '@/utils/displaySanitizer';

function betragStr(dok: Dokument): string | null {
  return dok.betrag ? formatBetrag(dok.betrag as number) : null;
}

function detectAmountAnomaly(dok: Dokument, alleDocs: Dokument[]): number | null {
  if (!dok.betrag || (dok.betrag as number) <= 0) return null;
  const similar = alleDocs.filter(
    d => d.id !== dok.id && d.typ === dok.typ && d.absender === dok.absender && d.betrag && (d.betrag as number) > 0
  );
  if (similar.length < 2) return null;
  const avg = similar.reduce((s, d) => s + (d.betrag as number), 0) / similar.length;
  const diff = ((dok.betrag as number) - avg) / avg;
  return Math.abs(diff) >= 0.15 ? diff : null;
}

export function buildUploadNotificationContent(
  dok: Dokument,
  alleDocs: Dokument[],
): { title: string; body: string } {
  const tage = getTageVerbleibend(dok.frist);
  const betrag = betragStr(dok);
  const absender = dok.absender !== 'Unbekannter Absender' ? dok.absender : dok.typ;
  const anomaly = detectAmountAnomaly(dok, alleDocs);
  const displayTitle = safeDisplayTitel(dok.titel, dok.typ, dok.confidence);

  if (anomaly !== null) {
    const pct = Math.round(Math.abs(anomaly) * 100);
    const direction = anomaly > 0 ? 'höher' : 'niedriger';
    return {
      title: `${absender}: ${pct}% ${direction} als üblich`,
      body: betrag
        ? `${betrag}${tage !== null && tage >= 0 ? ` — fällig in ${tage} Tag${tage !== 1 ? 'en' : ''}` : ' — bereits überfällig'}`
        : `Bitte prüfen`,
    };
  }

  if (tage !== null && tage < 0) {
    return {
      title: `🚨 Überfällig: ${absender}`,
      body: betrag ? `${betrag} — Frist ist abgelaufen` : `Sofort handeln`,
    };
  }

  if (tage === 0) {
    return {
      title: `🔴 Heute fällig: ${absender}`,
      body: betrag ? `${betrag} — letzter Tag` : `Frist endet heute`,
    };
  }

  if (tage !== null && tage <= 7) {
    return {
      title: `⏰ ${absender}: noch ${tage} Tag${tage !== 1 ? 'e' : ''}`,
      body: betrag ? `${betrag} — ${dok.risiko === 'hoch' ? 'dringend handeln' : 'im Blick behalten'}` : dok.typ,
    };
  }

  if (['Mahnung', 'Bußgeld', 'Kündigung'].includes(dok.typ)) {
    return {
      title: `⚠️ ${dok.typ} von ${absender}`,
      body: betrag ? `${betrag}${tage !== null ? ` — Frist in ${tage} Tagen` : ''}` : `Jetzt prüfen`,
    };
  }

  return {
    title: `${absender}: ${dok.typ} erkannt`,
    body: [betrag, tage !== null && tage >= 0 ? `Frist in ${tage} Tagen` : null, dok.zusammenfassung?.slice(0, 60)]
      .filter(Boolean).join(' — ') || displayTitle,
  };
}
