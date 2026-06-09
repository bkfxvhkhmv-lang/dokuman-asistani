import { validiereIBAN } from '@/services/visionApi';
import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';
import { formatBetrag, getTageVerbleibend } from '@/utils/formatters';
import type { Dokument } from '@/store';

export interface OcrRisikoWort {
  wort: string; risiko: 'hoch' | 'mittel'; grund: string;
}

export function schaetzeOcrRisiko(rohText: string | null | undefined): OcrRisikoWort[] {
  const lang = getLangSync();
  if (!rohText || rohText.length < 10) return [];
  const risikWorte: OcrRisikoWort[] = [];
  const worte = rohText.split(/\s+/);
  const VERDAECHTIG = [
    { re: /[0Oo][Il1][Il1][0Oo]/, grund: t(lang, 'risk_analysis.ocr.confusable_chars') },
    { re: /\b[a-z]{1,2}[A-Z][a-z]/, grund: t(lang, 'risk_analysis.ocr.unusual_case') },
    { re: /\b\d{1,2}[.,]\d{3,}\b/, grund: t(lang, 'risk_analysis.ocr.unusual_decimal') },
    { re: /[€$£]\s*\d{1,2}(?!\d)/, grund: t(lang, 'risk_analysis.ocr.amount_too_small') },
  ];
  for (const wort of worte) {
    if (wort.length < 2) continue;
    if (/[|¦\\\/]{2,}/.test(wort)) { risikWorte.push({ wort, risiko: 'hoch', grund: t(lang, 'risk_analysis.ocr.unreadable') }); continue; }
    if (/\b\d+[A-Za-z]\d+\b/.test(wort)) { risikWorte.push({ wort, risiko: 'mittel', grund: t(lang, 'risk_analysis.ocr.letter_in_number') }); continue; }
    for (const { re, grund } of VERDAECHTIG) {
      if (re.test(wort)) { risikWorte.push({ wort, risiko: 'mittel', grund }); break; }
    }
  }
  const ibanMatch = rohText.match(/\b[A-Z]{2}\d{2}[\dA-Z]{11,30}\b/g);
  if (ibanMatch) {
    for (const iban of ibanMatch) {
      if (!validiereIBAN(iban)) risikWorte.push({ wort: iban, risiko: 'hoch', grund: t(lang, 'risk_analysis.ocr.iban_invalid') });
    }
  }
  return risikWorte.slice(0, 10);
}

export interface VertragRisiko { level: 'hoch' | 'mittel' | 'niedrig'; icon: string; text: string }

export function analysiereVertragRisiken(rohText: string | null | undefined): VertragRisiko[] {
  const lang = getLangSync();
  if (!rohText || rohText.length < 20) return [];
  const risiken: VertragRisiko[] = [];
  if (/automatisch.*verl[äa]ngert|verl[äa]ngerung.*automatisch/i.test(rohText)) risiken.push({ level: 'hoch', icon: 'warning-circle', text: t(lang, 'risk_analysis.contract.auto_renewal') });
  const fristM = rohText.match(/k[üu]ndigungs(?:frist)?[:\s]+(\d+)\s*(monat|woche|tag)/i);
  if (fristM) risiken.push({ level: 'mittel', icon: 'clipboard-text', text: t(lang, 'risk_analysis.contract.notice_period', { count: fristM[1], unit: fristM[2] }) });
  else if (/k[üu]ndigung/i.test(rohText)) risiken.push({ level: 'mittel', icon: 'clipboard-text', text: t(lang, 'risk_analysis.contract.notice_check') });
  if (/preiserh[öo]hung|preisanpassung/i.test(rohText)) risiken.push({ level: 'hoch', icon: 'currency-eur', text: t(lang, 'risk_analysis.contract.price_increase') });
  const laufM = rohText.match(/mindestlaufzeit[:\s]+(\d+)\s*(monat|jahr)/i);
  if (laufM) risiken.push({ level: 'mittel', icon: 'lock', text: t(lang, 'risk_analysis.contract.minimum_term', { count: laufM[1], unit: laufM[2] }) });
  if (/datenweitergabe|daten.*dritte/i.test(rohText)) risiken.push({ level: 'hoch', icon: 'warning-circle', text: t(lang, 'risk_analysis.contract.third_party_data') });
  if (/haftungsausschluss|haftungsbesch/i.test(rohText)) risiken.push({ level: 'niedrig', icon: 'info', text: t(lang, 'risk_analysis.contract.liability_limit') });
  return risiken;
}

export function berechneHukukiRiskSkoru(risiken: VertragRisiko[]): number {
  if (!risiken || risiken.length === 0) return 0;
  const agirlik: Record<string, number> = { hoch: 35, mittel: 20, niedrig: 8 };
  return Math.min(100, risiken.reduce((s, r) => s + (agirlik[r.level] || 0), 0));
}

export function analysiereAllgemeinRisiken(dok: Dokument): VertragRisiko[] {
  const lang = getLangSync();
  const risiken: VertragRisiko[] = [];
  const tage = getTageVerbleibend(dok.frist);
  if (dok.risiko === 'hoch' && tage !== null && tage <= 3) risiken.push({ level: 'hoch', icon: 'clock', text: t(lang, 'risk_analysis.general.deadline_soon') });
  if (dok.risiko === 'hoch' && tage !== null && tage < 0) risiken.push({ level: 'hoch', icon: 'warning-octagon', text: t(lang, 'risk_analysis.general.deadline_passed') });
  if (dok.typ === 'Mahnung') risiken.push({ level: 'hoch', icon: 'warning-circle', text: t(lang, 'risk_analysis.general.reminder') });
  if (dok.typ === 'Bußgeld' && tage !== null && tage <= 14) risiken.push({ level: 'hoch', icon: 'warning-octagon', text: t(lang, 'risk_analysis.general.fine_deadline') });
  if (dok.typ === 'Steuerbescheid') risiken.push({ level: 'mittel', icon: 'chart-bar', text: t(lang, 'risk_analysis.general.tax_objection') });
  if (dok.typ === 'Kündigung') risiken.push({ level: 'hoch', icon: 'scissors', text: t(lang, 'risk_analysis.general.termination') });
  if (!dok.betrag && ['Rechnung', 'Mahnung', 'Bußgeld'].includes(dok.typ)) risiken.push({ level: 'mittel', icon: 'warning-circle', text: t(lang, 'risk_analysis.general.amount_missing') });
  if (dok.typ === 'Vertrag') risiken.push(...analysiereVertragRisiken((dok as any).rohText));
  return risiken;
}

export interface DarkPattern {
  id: string; schwere: 'hoch' | 'mittel' | 'niedrig'; titel: string;
  beschreibung: string; rechtsgrundlage: string; empfehlung: string;
}

export function erkenneDarkPatterns(dok: Dokument): DarkPattern[] {
  const lang = getLangSync();
  const warnungen: DarkPattern[] = [];
  if (!dok) return warnungen;
  const heute = new Date();
  const dok2 = dok as any;
  if (dok.typ === 'Mahnung' && dok.betrag) {
    const hauptforderung = parseFloat(dok.betrag as any);
    if (!isNaN(hauptforderung) && dok2.inkassoGebuehr) {
      let maxGebuehr = 0;
      if (hauptforderung <= 500) maxGebuehr = 75; else if (hauptforderung <= 1000) maxGebuehr = 100; else maxGebuehr = hauptforderung * 0.015 + 20;
      if (parseFloat(dok2.inkassoGebuehr) > maxGebuehr) warnungen.push({ id: 'inkasso_zu_hoch', schwere: 'hoch', titel: t(lang, 'risk_analysis.dark.inkasso_title'), beschreibung: t(lang, 'risk_analysis.dark.inkasso_body', { fee: formatBetrag(dok2.inkassoGebuehr) ?? '', maxFee: formatBetrag(maxGebuehr) ?? '' }), rechtsgrundlage: 'RDG §13 i.V.m. Anlage zu §2 RVG', empfehlung: t(lang, 'risk_analysis.dark.inkasso_action') });
    }
  }
  if (dok2.zinsen && parseFloat(dok2.zinsen) > 10) warnungen.push({ id: 'zinsen_hoch', schwere: 'mittel', titel: t(lang, 'risk_analysis.dark.interest_title'), beschreibung: t(lang, 'risk_analysis.dark.interest_body', { rate: dok2.zinsen }), rechtsgrundlage: 'BGB §288', empfehlung: t(lang, 'risk_analysis.dark.interest_action') });
  if (dok.frist) {
    const tageBisZahlung = Math.round((new Date(dok.frist).getTime() - heute.getTime()) / 86400000);
    if (tageBisZahlung >= 0 && tageBisZahlung < 7) warnungen.push({ id: 'frist_sehr_kurz', schwere: 'mittel', titel: t(lang, 'risk_analysis.dark.short_deadline_title'), beschreibung: t(lang, 'risk_analysis.dark.short_deadline_body', { days: tageBisZahlung }), rechtsgrundlage: 'BGB §271 / §286', empfehlung: t(lang, 'risk_analysis.dark.short_deadline_action') });
  }
  if (dok2.schufaDrohung) warnungen.push({ id: 'schufa_drohung', schwere: 'mittel', titel: t(lang, 'risk_analysis.dark.schufa_title'), beschreibung: t(lang, 'risk_analysis.dark.schufa_body'), rechtsgrundlage: 'DSGVO Art. 6 / BDSG §31', empfehlung: t(lang, 'risk_analysis.dark.schufa_action') });
  if (dok2.mahnungNummer && parseInt(dok2.mahnungNummer) >= 3) warnungen.push({ id: 'mehrfache_mahnung', schwere: 'niedrig', titel: t(lang, 'risk_analysis.dark.multiple_title'), beschreibung: t(lang, 'risk_analysis.dark.multiple_body', { number: dok2.mahnungNummer }), rechtsgrundlage: 'RDG §13', empfehlung: t(lang, 'risk_analysis.dark.multiple_action') });
  return warnungen;
}
