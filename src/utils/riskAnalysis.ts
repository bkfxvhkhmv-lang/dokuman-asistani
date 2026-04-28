import { validiereIBAN } from '../services/visionApi';
import { formatBetrag, getTageVerbleibend } from './formatters';
import type { Dokument } from '../store';

export interface OcrRisikoWort {
  wort: string; risiko: 'hoch' | 'mittel'; grund: string;
}

export function schaetzeOcrRisiko(rohText: string | null | undefined): OcrRisikoWort[] {
  if (!rohText || rohText.length < 10) return [];
  const risikWorte: OcrRisikoWort[] = [];
  const worte = rohText.split(/\s+/);
  const VERDAECHTIG = [
    { re: /[0Oo][Il1][Il1][0Oo]/, grund: 'Ziffern/Buchstaben-Verwechslung (0/O, 1/I/l)' },
    { re: /\b[a-z]{1,2}[A-Z][a-z]/, grund: 'Ungewöhnliche Groß-/Kleinschreibung' },
    { re: /\b\d{1,2}[.,]\d{3,}\b/, grund: 'Ungewöhnliche Dezimalzahl' },
    { re: /[€$£]\s*\d{1,2}(?!\d)/, grund: 'Betrag scheint zu klein (< 10)' },
  ];
  for (const wort of worte) {
    if (wort.length < 2) continue;
    if (/[|¦\\\/]{2,}/.test(wort)) { risikWorte.push({ wort, risiko: 'hoch', grund: 'Unlesbare Zeichen' }); continue; }
    if (/\b\d+[A-Za-z]\d+\b/.test(wort)) { risikWorte.push({ wort, risiko: 'mittel', grund: 'Buchstabe in Zahl eingefügt' }); continue; }
    for (const { re, grund } of VERDAECHTIG) {
      if (re.test(wort)) { risikWorte.push({ wort, risiko: 'mittel', grund }); break; }
    }
  }
  const ibanMatch = rohText.match(/\b[A-Z]{2}\d{2}[\dA-Z]{11,30}\b/g);
  if (ibanMatch) {
    for (const iban of ibanMatch) {
      if (!validiereIBAN(iban)) risikWorte.push({ wort: iban, risiko: 'hoch', grund: 'IBAN-Prüfziffer stimmt nicht — OCR-Fehler?' });
    }
  }
  return risikWorte.slice(0, 10);
}

export interface VertragRisiko { level: 'hoch' | 'mittel' | 'niedrig'; icon: string; text: string }

export function analysiereVertragRisiken(rohText: string | null | undefined): VertragRisiko[] {
  if (!rohText || rohText.length < 20) return [];
  const risiken: VertragRisiko[] = [];
  if (/automatisch.*verl[äa]ngert|verl[äa]ngerung.*automatisch/i.test(rohText)) risiken.push({ level: 'hoch', icon: '⚠️', text: 'Automatische Verlängerungsklausel' });
  const fristM = rohText.match(/k[üu]ndigungs(?:frist)?[:\s]+(\d+)\s*(monat|woche|tag)/i);
  if (fristM) risiken.push({ level: 'mittel', icon: '📋', text: `Kündigungsfrist: ${fristM[1]} ${fristM[2]}` });
  else if (/k[üu]ndigung/i.test(rohText)) risiken.push({ level: 'mittel', icon: '📋', text: 'Kündigungsfrist im Vertrag prüfen' });
  if (/preiserh[öo]hung|preisanpassung/i.test(rohText)) risiken.push({ level: 'hoch', icon: '💸', text: 'Preiserhöhungsklausel erkannt' });
  const laufM = rohText.match(/mindestlaufzeit[:\s]+(\d+)\s*(monat|jahr)/i);
  if (laufM) risiken.push({ level: 'mittel', icon: '🔒', text: `Mindestlaufzeit: ${laufM[1]} ${laufM[2]}` });
  if (/datenweitergabe|daten.*dritte/i.test(rohText)) risiken.push({ level: 'hoch', icon: '', text: 'Datenweitergabe an Dritte' });
  if (/haftungsausschluss|haftungsbesch/i.test(rohText)) risiken.push({ level: 'niedrig', icon: 'ℹ️', text: 'Haftungsbeschränkung vorhanden' });
  return risiken;
}

export function berechneHukukiRiskSkoru(risiken: VertragRisiko[]): number {
  if (!risiken || risiken.length === 0) return 0;
  const agirlik: Record<string, number> = { hoch: 35, mittel: 20, niedrig: 8 };
  return Math.min(100, risiken.reduce((s, r) => s + (agirlik[r.level] || 0), 0));
}

export function analysiereAllgemeinRisiken(dok: Dokument): VertragRisiko[] {
  const risiken: VertragRisiko[] = [];
  const tage = getTageVerbleibend(dok.frist);
  if (dok.risiko === 'hoch' && tage !== null && tage <= 3) risiken.push({ level: 'hoch', icon: '⏰', text: 'Frist in weniger als 3 Tagen' });
  if (dok.risiko === 'hoch' && tage !== null && tage < 0) risiken.push({ level: 'hoch', icon: '🚨', text: 'Frist bereits abgelaufen' });
  if (dok.typ === 'Mahnung') risiken.push({ level: 'hoch', icon: '⚠️', text: 'Mahnung — Vollstreckung möglich' });
  if (dok.typ === 'Bußgeld' && tage !== null && tage <= 14) risiken.push({ level: 'hoch', icon: '🚔', text: 'Einspruchsfrist läuft ab' });
  if (dok.typ === 'Steuerbescheid') risiken.push({ level: 'mittel', icon: '📊', text: 'Einspruch innerhalb 30 Tage möglich' });
  if (dok.typ === 'Kündigung') risiken.push({ level: 'hoch', icon: '✂️', text: 'Kündigung — Fristen und Rechte prüfen' });
  if (!dok.betrag && ['Rechnung', 'Mahnung', 'Bußgeld'].includes(dok.typ)) risiken.push({ level: 'mittel', icon: '❓', text: 'Betrag nicht erkannt — manuell prüfen' });
  if (dok.typ === 'Vertrag') risiken.push(...analysiereVertragRisiken((dok as any).rohText));
  return risiken;
}

export interface DarkPattern {
  id: string; schwere: 'hoch' | 'mittel' | 'niedrig'; titel: string;
  beschreibung: string; rechtsgrundlage: string; empfehlung: string;
}

export function erkenneDarkPatterns(dok: Dokument): DarkPattern[] {
  const warnungen: DarkPattern[] = [];
  if (!dok) return warnungen;
  const heute = new Date();
  const dok2 = dok as any;
  if (dok.typ === 'Mahnung' && dok.betrag) {
    const hauptforderung = parseFloat(dok.betrag as any);
    if (!isNaN(hauptforderung) && dok2.inkassoGebuehr) {
      let maxGebuehr = 0;
      if (hauptforderung <= 500) maxGebuehr = 75; else if (hauptforderung <= 1000) maxGebuehr = 100; else maxGebuehr = hauptforderung * 0.015 + 20;
      if (parseFloat(dok2.inkassoGebuehr) > maxGebuehr) warnungen.push({ id: 'inkasso_zu_hoch', schwere: 'hoch', titel: 'Inkasso-Gebühr möglicherweise zu hoch', beschreibung: `Verlangte Gebühr (${formatBetrag(dok2.inkassoGebuehr)}) übersteigt den gesetzlichen Höchstbetrag von ${formatBetrag(maxGebuehr)}.`, rechtsgrundlage: 'RDG §13 i.V.m. Anlage zu §2 RVG', empfehlung: 'Gebühr schriftlich beanstanden.' });
    }
  }
  if (dok2.zinsen && parseFloat(dok2.zinsen) > 10) warnungen.push({ id: 'zinsen_hoch', schwere: 'mittel', titel: 'Ungewöhnlich hoher Zinssatz', beschreibung: `Zinssatz von ${dok2.zinsen}% liegt deutlich über dem gesetzlichen Verzugszinssatz.`, rechtsgrundlage: 'BGB §288', empfehlung: 'Zinssatz prüfen lassen.' });
  if (dok.frist) {
    const tageBisZahlung = Math.round((new Date(dok.frist).getTime() - heute.getTime()) / 86400000);
    if (tageBisZahlung >= 0 && tageBisZahlung < 7) warnungen.push({ id: 'frist_sehr_kurz', schwere: 'mittel', titel: 'Sehr kurze Zahlungsfrist', beschreibung: `Nur ${tageBisZahlung} Tag(e) bis zur Zahlungsfrist.`, rechtsgrundlage: 'BGB §271 / §286', empfehlung: 'Stundung beantragen.' });
  }
  if (dok2.schufaDrohung) warnungen.push({ id: 'schufa_drohung', schwere: 'mittel', titel: 'Schufa-Androhung festgestellt', beschreibung: 'Das Schreiben enthält eine Drohung mit einem Schufa-Eintrag.', rechtsgrundlage: 'DSGVO Art. 6 / BDSG §31', empfehlung: 'Bei strittiger Forderung: Widerspruch einlegen.' });
  if (dok2.mahnungNummer && parseInt(dok2.mahnungNummer) >= 3) warnungen.push({ id: 'mehrfache_mahnung', schwere: 'niedrig', titel: 'Mehrfachmahnung — Kosten könnten unverhältnismäßig sein', beschreibung: `Dies ist Mahnung Nr. ${dok2.mahnungNummer}.`, rechtsgrundlage: 'RDG §13', empfehlung: 'Alle Mahngebühren zusammen auf Plausibilität prüfen.' });
  return warnungen;
}
