import type { ExtractedFields, KorrekturVorschlag } from './types';

export function buildKorrekturVorschlaege(
  fields: ExtractedFields,
  text: string,
): KorrekturVorschlag[] {
  const vorschlaege: KorrekturVorschlag[] = [];

  if (fields.betrag !== null) {
    if (fields.betrag < 0.01 || fields.betrag > 500000) {
      vorschlaege.push({
        feldKey: 'betrag',
        grund: `Betrag ${fields.betrag}€ erscheint unplausibel`,
        vorschlag: null,
      });
    }
  }

  if (!fields.iban && ['Rechnung', 'Mahnung'].includes(fields.typ) && /iban/i.test(text)) {
    vorschlaege.push({
      feldKey: 'iban',
      grund: 'IBAN im Text erwähnt, aber nicht korrekt erkannt',
      vorschlag: null,
    });
  }

  if (fields.frist) {
    const fristDate = new Date(fields.frist);
    const diff = Math.round((fristDate.getTime() - Date.now()) / 86400000);
    if (diff < -365) {
      vorschlaege.push({
        feldKey: 'frist',
        grund: 'Erkanntes Datum liegt mehr als 1 Jahr in der Vergangenheit — OCR-Fehler?',
        vorschlag: null,
      });
    }
  }

  return vorschlaege;
}
