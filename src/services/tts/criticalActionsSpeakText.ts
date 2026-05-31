import type { Dokument } from '@/store';

function fmtFrist(iso: string, tr: boolean): string {
  return new Date(iso).toLocaleDateString(tr ? 'tr-TR' : 'de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function isUnknownLike(v: string | null | undefined): boolean {
  const s = (v ?? '').trim().toLowerCase();
  return !s || s === 'unbekannt' || s === 'unknown' || s === 'unbekannter absender';
}

function isPaymentType(typ: string | null | undefined): boolean {
  return /rechnung|mahnung|bußgeld|bussgeld|steuer|beitrag/i.test(typ ?? '');
}

function isInsurance(typ: string | null | undefined): boolean {
  return /versicherung/i.test(typ ?? '');
}

/**
 * Builds a short, natural German (or Turkish) spoken summary for "Kritische Punkte anhören".
 * Never reads UI section headers like "Risiko", "Empfohlene Aktionen", "Kalendereintrag".
 * Returns 1–3 conversational sentences focused on what the user should check or do next.
 */
export function buildCriticalActionsSpeakText(d: Dokument, lang: string): string | null {
  const tr = lang === 'tr';
  const sentences: string[] = [];

  const betragFehlt = d.betrag == null;
  const ibanFehlt   = !d.iban;
  const senderFehlt = isUnknownLike(d.absender);
  const hatFrist    = !!d.frist;
  const istZahlung  = isPaymentType(d.typ);
  const istVersicherung = isInsurance(d.typ);
  const istHoch     = d.risiko === 'hoch';

  if (tr) {
    // Turkish summary
    if (betragFehlt && istZahlung) {
      sentences.push('Tutar güvenli bir şekilde tanınamadı. Ödeme yapmadan önce lütfen tutarı kontrol et veya tamamla.');
    } else if (betragFehlt && istVersicherung) {
      sentences.push('Sigorta tutarı tanınamadı. Lütfen tutarı kontrol et.');
    } else if (istZahlung && ibanFehlt) {
      sentences.push('Havale için bazı bilgiler eksik. Lütfen tutar, alacaklı ve IBAN\'ı kontrol et.');
    }

    if (senderFehlt) {
      sentences.push('Gönderen güvenli bir şekilde tanınamadı. Lütfen gönderenin doğru olup olmadığını kontrol et.');
    }

    if (hatFrist) {
      const f = fmtFrist(d.frist!, tr);
      sentences.push(`${f} tarihli olası bir son tarih var. Gerekirse bir takvim hatırlatıcısı oluştur.`);
    }

    if (istHoch && sentences.length === 0) {
      sentences.push('Bu belgede yüksek risk işareti var. Lütfen dikkatlice incele.');
    }

    if (sentences.length === 0) {
      sentences.push('Lütfen başlıca bilgileri kısaca kontrol et: gönderen, tutar ve tarih.');
    }
  } else {
    // German summary — conversational, user-first
    if (betragFehlt && istZahlung) {
      sentences.push('Der Betrag wurde nicht sicher erkannt. Bitte prüfe oder ergänze den Betrag, bevor du eine Zahlung vorbereitest.');
    } else if (betragFehlt && istVersicherung) {
      sentences.push('Der Versicherungsbeitrag wurde nicht erkannt. Bitte prüfe den Betrag im Dokument.');
    } else if (istZahlung && ibanFehlt) {
      sentences.push('Für eine Überweisung fehlen noch Angaben. Bitte prüfe Betrag, Empfänger und IBAN.');
    }

    if (senderFehlt) {
      sentences.push('Der Absender wurde nicht sicher erkannt. Bitte prüfe, ob der Absender zum Dokument passt.');
    }

    if (hatFrist) {
      const f = fmtFrist(d.frist!, tr);
      sentences.push(`Es gibt eine mögliche Frist bis ${f}. Lege bei Bedarf einen Kalendereintrag an.`);
    }

    if (istHoch && sentences.length === 0) {
      sentences.push('Dieses Dokument hat ein erhöhtes Risiko. Bitte prüfe die wichtigsten Angaben sorgfältig.');
    }

    if (sentences.length === 0) {
      sentences.push('Bitte prüfe die wichtigsten Angaben kurz: Absender, Betrag und Datum.');
    }
  }

  return sentences.join(' ');
}
