/**
 * Belge listesini secili yila gore guruplayip ozet ureten hook.
 *
 * Donen veri:
 *  - yillar          : kullaniciya gosterilecek yil chip'leri
 *  - monatsGruppen   : 12 aylik bar chart datasi (her ay 0+ tutar)
 *  - typGruppen      : dokumenttipine gore toplam (yuzde icin)
 *  - absenderGruppen : ozellikle yuksek harcamali firmalar (top-N)
 *  - gesamtBetrag    : yilin toplami
 *  - seciliAyDocs    : secili ay icindeki dokumentler (sortlanmis)
 *  - seciliAyBetrag  : secili ayin tutari
 */
import { useMemo } from 'react';
import type { Dokument } from '@/store';
import type { TypGruppe, AbsenderGruppe, MonatsGruppe } from '@/components/budget-grafik/types';

export interface BudgetData {
  yillar:          number[];
  monatsGruppen:   MonatsGruppe[];
  typGruppen:      TypGruppe[];
  absenderGruppen: AbsenderGruppe[];
  gesamtBetrag:    number;
  seciliAyDocs:    Dokument[];
  seciliAyBetrag:  number;
  maxMonatsBetrag: number;
}

export function useBudgetData(
  docs: Dokument[],
  seciliYil: number,
  seciliMonat: number,
): BudgetData {
  const mevcutYil = new Date().getFullYear();

  const yillar = useMemo(() => {
    const s = new Set(
      docs.map(d => d.datum ? new Date(d.datum).getFullYear() : null)
          .filter((y): y is number => y !== null),
    );
    s.add(mevcutYil);
    return [...s].sort((a, b) => b - a);
  }, [docs, mevcutYil]);

  const grouped = useMemo(() => {
    const yilDocs = docs.filter(d =>
      d.datum &&
      new Date(d.datum).getFullYear() === seciliYil &&
      (d.betrag ?? 0) > 0,
    );

    const monatsMap:   Record<number, number>                          = {};
    for (let i = 1; i <= 12; i++) monatsMap[i] = 0;
    const typMap:      Record<string, { betrag: number; anzahl: number }> = {};
    const absenderMap: Record<string, { betrag: number; anzahl: number }> = {};
    let total = 0;

    yilDocs.forEach(d => {
      const betrag = d.betrag ?? 0;
      const monat  = new Date(d.datum).getMonth() + 1;
      monatsMap[monat] = (monatsMap[monat] || 0) + betrag;
      total += betrag;

      const typ = d.typ || 'Sonstiges';
      typMap[typ] = typMap[typ] || { betrag: 0, anzahl: 0 };
      typMap[typ].betrag += betrag;
      typMap[typ].anzahl += 1;

      if (d.absender) {
        absenderMap[d.absender] = absenderMap[d.absender] || { betrag: 0, anzahl: 0 };
        absenderMap[d.absender].betrag += betrag;
        absenderMap[d.absender].anzahl += 1;
      }
    });

    const monatsGruppen: MonatsGruppe[] = Object.entries(monatsMap).map(([m, b]) => ({
      monat: parseInt(m, 10), betrag: b,
    }));
    const typGruppen: TypGruppe[] = Object.entries(typMap)
      .sort((a, b) => b[1].betrag - a[1].betrag)
      .map(([typ, v]) => ({ typ, ...v }));
    const absenderGruppen: AbsenderGruppe[] = Object.entries(absenderMap)
      .sort((a, b) => b[1].betrag - a[1].betrag)
      .map(([ad, v]) => ({ ad, ...v }));

    return { monatsGruppen, typGruppen, absenderGruppen, gesamtBetrag: total };
  }, [docs, seciliYil]);

  const seciliAyDocs = useMemo(() => {
    return docs.filter(d => {
      if (!d.datum) return false;
      const dt = new Date(d.datum);
      return dt.getFullYear() === seciliYil
          && dt.getMonth() + 1 === seciliMonat
          && (d.betrag ?? 0) > 0;
    }).sort((a, b) => (b.betrag ?? 0) - (a.betrag ?? 0));
  }, [docs, seciliYil, seciliMonat]);

  const maxMonatsBetrag = Math.max(...grouped.monatsGruppen.map(m => m.betrag), 1);
  const seciliAyBetrag  = grouped.monatsGruppen.find(m => m.monat === seciliMonat)?.betrag || 0;

  return {
    yillar,
    monatsGruppen:   grouped.monatsGruppen,
    typGruppen:      grouped.typGruppen,
    absenderGruppen: grouped.absenderGruppen,
    gesamtBetrag:    grouped.gesamtBetrag,
    seciliAyDocs,
    seciliAyBetrag,
    maxMonatsBetrag,
  };
}
