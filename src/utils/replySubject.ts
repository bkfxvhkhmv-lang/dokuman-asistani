import type { Dokument } from '@/store';

const ABSENDER_MAX = 48;

function formatFristShort(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function isUsableAbsender(v: string): boolean {
  if (!v || v.trim().length < 2) return false;
  if (/unbekannt/i.test(v)) return false;
  return true;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max).trimEnd() + '…' : s;
}

/**
 * Belge bağlamına göre kısa, profesyonel bir e-posta konusu üretir.
 *
 * Öncelik: Aktenzeichen → Rechnungsnr → Vertragsnr → Frist → Absender → fallback label
 *
 * IBAN/BIC/Telefon konu başlığına girmez.
 * "Unbekannt" içeren absender atlanır.
 */
export function buildEmailSubject(templateLabel: string, dok?: Dokument): string {
  if (!dok) return templateLabel;

  if (dok.aktenzeichen) {
    return `${templateLabel} zu Aktenzeichen ${dok.aktenzeichen}`;
  }
  if (dok.rechnungsnr) {
    return `${templateLabel} zu Rechnung ${dok.rechnungsnr}`;
  }
  if (dok.vertragsnr) {
    return `${templateLabel} zu Vertrag ${dok.vertragsnr}`;
  }
  if (dok.frist) {
    return `${templateLabel} – Frist bis ${formatFristShort(dok.frist)}`;
  }
  if (dok.absender && isUsableAbsender(dok.absender)) {
    return `${templateLabel} – ${truncate(dok.absender, ABSENDER_MAX)}`;
  }
  return templateLabel;
}
