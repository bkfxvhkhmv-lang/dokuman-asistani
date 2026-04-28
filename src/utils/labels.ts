import { formatBetrag } from './formatters';
import type { Dokument } from '../store';

export function schlagoEtikettenVor(dok: Dokument, haufig: string[] = []): string[] {
  const set = new Set<string>();
  const typMap: Record<string, string[]> = { Rechnung: ['Bezahlung', 'Buchhaltung'], Mahnung: ['Dringend', 'Mahnung'], Steuerbescheid: ['Steuer', 'Finanzamt'], Versicherung: ['Versicherung'], Vertrag: ['Vertrag', 'Wichtig'], Kündigung: ['Kündigung', 'Wichtig'], Bußgeld: ['Bußgeld', 'Dringend'], Behörde: ['Behörde', 'Offiziell'], Termin: ['Termin'] };
  (typMap[dok.typ] || []).forEach(e => set.add(e));
  const lower = (dok.rohText || dok.zusammenfassung || '').toLowerCase();
  if (/wohnung|miete|nebenkosten/.test(lower)) set.add('Wohnung');
  if (/auto|fahrzeug|kfz|pkw/.test(lower)) set.add('Auto');
  if (/arzt|krankenhaus|gesundheit|medizin/.test(lower)) set.add('Gesundheit');
  if (/arbeit|gehalt|lohn|arbeitgeber/.test(lower)) set.add('Arbeit');
  if (/bank|konto|kredit/.test(lower)) set.add('Bank');
  if (/kind|schule|kindergarten/.test(lower)) set.add('Familie');
  haufig.slice(0, 3).forEach(e => set.add(e));
  return [...set].slice(0, 8);
}

export interface AufgabeVorschlag {
  id: string; titel: string; frist: string; prioritaet: 'hoch' | 'mittel' | 'niedrig'; grund: string; icon: string;
}

export function generiereAufgabenVorschlaege(dok: Dokument): AufgabeVorschlag[] {
  const vorschlaege: AufgabeVorschlag[] = [];
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r.toISOString().slice(0, 10); };
  if (dok.betrag && (dok.betrag) > 0 && !dok.erledigt) {
    const frist = dok.frist ? new Date(dok.frist) : null;
    const tage = frist ? Math.round((frist.getTime() - heute.getTime()) / 86400000) : null;
    vorschlaege.push({ id: `auto_zahlung_${dok.id}`, titel: `Zahlung: ${formatBetrag(dok.betrag)} an ${dok.absender || 'Empfänger'}`, frist: dok.frist ? dok.frist.slice(0, 10) : addDays(heute, 14), prioritaet: tage !== null && tage <= 3 ? 'hoch' : tage !== null && tage <= 7 ? 'mittel' : 'niedrig', grund: tage !== null ? `Fällig in ${tage} Tagen` : 'Kein Fälligkeitsdatum', icon: '💶' });
  }
  if (dok.typ === 'Mahnung')        vorschlaege.push({ id: `auto_mahnung_${dok.id}`,   titel: `Mahnung beantworten: ${dok.absender || dok.titel}`, frist: addDays(heute, 3),  prioritaet: 'hoch',   grund: 'Mahnungen erfordern schnelle Reaktion',         icon: '⚠️' });
  if (dok.typ === 'Bußgeld')        vorschlaege.push({ id: `auto_bussgeld_${dok.id}`,  titel: `Einspruch prüfen: ${dok.titel}`,                   frist: addDays(heute, 14), prioritaet: 'hoch',   grund: 'Einspruchsfrist läuft (in der Regel 14 Tage)',  icon: '🚔' });
  if (dok.typ === 'Steuerbescheid') vorschlaege.push({ id: `auto_steuer_${dok.id}`,    titel: `Steuerbescheid prüfen: ${dok.titel}`,              frist: addDays(heute, 28), prioritaet: 'mittel', grund: 'Einspruchsfrist: 1 Monat nach Bekanntgabe',    icon: '📊' });
  if (dok.typ === 'Vertrag') {
    const rohLower = (dok.rohText || '').toLowerCase();
    const kuendMatch = rohLower.match(/kündigung.*?(\d+)\s*(?:wochen|monate?|tage)/);
    const fristTage = kuendMatch ? (rohLower.includes('monat') ? parseInt(kuendMatch[1]) * 30 : parseInt(kuendMatch[1]) * 7) : 30;
    vorschlaege.push({ id: `auto_vertrag_${dok.id}`, titel: `Vertrag kündigen oder verlängern: ${dok.titel}`, frist: addDays(heute, fristTage), prioritaet: 'mittel', grund: `Kündigungsfrist beachten (ca. ${fristTage} Tage)`, icon: '📝' });
  }
  if (dok.typ === 'Behörde' && dok.frist) {
    const tage = Math.round((new Date(dok.frist).getTime() - heute.getTime()) / 86400000);
    if (tage > 0 && tage <= 30) vorschlaege.push({ id: `auto_behoerde_${dok.id}`, titel: `Behördenpost beantworten: ${dok.titel}`, frist: dok.frist.slice(0, 10), prioritaet: tage <= 7 ? 'hoch' : 'mittel', grund: `Antwortfrist in ${tage} Tagen`, icon: '🏛' });
  }
  const fehlend: string[] = [];
  if (!dok.betrag && ['Rechnung', 'Mahnung', 'Bußgeld'].includes(dok.typ)) fehlend.push('Betrag');
  if (!dok.frist  && ['Rechnung', 'Mahnung', 'Behörde'].includes(dok.typ)) fehlend.push('Frist');
  if (!dok.absender) fehlend.push('Absender');
  if (fehlend.length > 0) vorschlaege.push({ id: `auto_fehlend_${dok.id}`, titel: `Dokument ergänzen: ${fehlend.join(', ')} fehlt`, frist: addDays(heute, 7), prioritaet: 'niedrig', grund: 'Unvollständige Daten erschweren die Bearbeitung', icon: '📋' });
  return vorschlaege;
}

export interface OzetQuelle { ozetSatz: string; quelle: string | null; konfidenz: number }

export function findeOzetQuellen(rohText: string | null | undefined, zusammenfassung: string | null | undefined): OzetQuelle[] {
  if (!rohText || !zusammenfassung) return [];
  const rohSaetze = rohText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
  const ozetSaetze = zusammenfassung.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  return ozetSaetze.map(ozetSatz => {
    const ozetWoerter = new Set(ozetSatz.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    let bestScore = 0, bestQuelle: string | null = null;
    for (const rohSatz of rohSaetze) {
      const treffer = rohSatz.toLowerCase().split(/\s+/).filter(w => w.length > 3 && ozetWoerter.has(w)).length;
      const score = ozetWoerter.size > 0 ? treffer / ozetWoerter.size : 0;
      if (score > bestScore) { bestScore = score; bestQuelle = rohSatz; }
    }
    return { ozetSatz, quelle: bestScore >= 0.25 ? bestQuelle : null, konfidenz: Math.round(bestScore * 100) };
  }).filter(item => item.quelle);
}

export interface ErweitertesFeld { key: string; label: string; wert: string; icon: string; isDate?: boolean }

export function extrahereFelderErweitert(rohText = '', _typ = ''): ErweitertesFeld[] {
  if (!rohText) return [];
  const felder: ErweitertesFeld[] = [];
  const kundeMatch = rohText.match(/[Kk]undennr\.?:?\s*([A-Z0-9/-]{4,20})/);
  if (kundeMatch) felder.push({ key: 'kundennr', label: 'Kundennummer', wert: kundeMatch[1].trim(), icon: '🔖' });
  const vertragNrMatch = rohText.match(/[Vv]ertragsnr\.?:?\s*([A-Z0-9/-]{4,20})/);
  if (vertragNrMatch) felder.push({ key: 'vertragsnr', label: 'Vertragsnummer', wert: vertragNrMatch[1].trim(), icon: '📝' });
  const rechnungNrMatch = rohText.match(/[Rr]echnungs(?:nummer|nr)\.?:?\s*([A-Z0-9/-]{4,20})/);
  if (rechnungNrMatch) felder.push({ key: 'rechnungnr', label: 'Rechnungsnummer', wert: rechnungNrMatch[1].trim(), icon: '' });
  const versNrMatch = rohText.match(/[Vv]ersicherungsnr\.?:?\s*([A-Z0-9/-]{4,20})/);
  if (versNrMatch) felder.push({ key: 'versnr', label: 'Versicherungsnr.', wert: versNrMatch[1].trim(), icon: '' });
  const beginnMatch = rohText.match(/[Vv]ertragsbeginn:?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/);
  if (beginnMatch) felder.push({ key: 'vertragsbeginn', label: 'Vertragsbeginn', wert: beginnMatch[1].trim(), icon: '📅', isDate: true });
  const endeMatch = rohText.match(/[Vv]ertragsende:?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/);
  if (endeMatch) felder.push({ key: 'vertragsende', label: 'Vertragsende', wert: endeMatch[1].trim(), icon: '⏳', isDate: true });
  const kuendMatch = rohText.match(/[Kk]ündigungs(?:frist|termin):?\s*([^\n,]{4,40})/);
  if (kuendMatch) felder.push({ key: 'kuendigung', label: 'Kündigungsfrist', wert: kuendMatch[1].trim(), icon: '✂️' });
  const steuerMatch = rohText.match(/(?:Steuer-ID|Steuernummer):?\s*([0-9/]{8,20})/);
  if (steuerMatch) felder.push({ key: 'steuerid', label: 'Steuernummer', wert: steuerMatch[1].trim(), icon: '📊' });
  const mwstMatch = rohText.match(/(?:MwSt|Mehrwertsteuer|USt)\.?:?\s*([\d.,]+)\s*€/);
  if (mwstMatch) felder.push({ key: 'mwst', label: 'MwSt.', wert: mwstMatch[1].trim() + ' €', icon: '💹' });
  const nettoMatch = rohText.match(/[Nn]etto(?:betrag|summe)?\s*:?\s*([\d.,]+)\s*€/);
  if (nettoMatch) felder.push({ key: 'netto', label: 'Nettobetrag', wert: nettoMatch[1].trim() + ' €', icon: '💶' });
  const refMatch = rohText.match(/(?:[Aa]ktenzeichen|[Rr]eferenz(?:nummer)?):?\s*([A-Z0-9/_-]{4,25})/);
  if (refMatch) felder.push({ key: 'referenz', label: 'Aktenzeichen', wert: refMatch[1].trim(), icon: '📎' });
  return felder;
}
