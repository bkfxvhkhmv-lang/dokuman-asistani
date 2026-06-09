import type { DocumentAnalysis } from '@/services/visionApi';
import { extrahiereIBAN } from '@/services/visionApi';
import type { AutoFillField, AutoFillResult, ExtractedFields } from './types';
import { FIELD_META, PFLICHT_FELDER } from './constants';
import {
  extractAktenzeichen,
  extractKundennr,
  extractRechnungsnr,
  extractSteuerid,
  extractTitelFromText,
  extractVertragsnr,
  extractZahlungszweck,
} from './extractors';
import { scoreAbsender, scoreBetrag, scoreFrist, scoreToConfidence, scoreTyp } from './scoring';
import { buildKorrekturVorschlaege } from './korrektur';

export function runSmartAutoFill(
  visionResult: DocumentAnalysis,
  rohText: string,
): AutoFillResult {
  const start = Date.now();

  const r = extractRechnungsnr(rohText);
  const k = extractKundennr(rohText);
  const a = extractAktenzeichen(rohText);
  const vn = extractVertragsnr(rohText);
  const zw = extractZahlungszweck(rohText, visionResult.typ, r.wert);
  const st = extractSteuerid(rohText);
  const iban = extrahiereIBAN(rohText);
  const titelResult = extractTitelFromText(rohText, visionResult.typ, visionResult.absender);

  const extracted: ExtractedFields = {
    titel:         titelResult.wert,
    typ:           visionResult.typ,
    absender:      visionResult.absender,
    betrag:        visionResult.betrag,
    frist:         visionResult.frist,
    iban:          iban,
    aktenzeichen:  a.wert,
    kundennr:      k.wert,
    rechnungsnr:   r.wert,
    vertragsnr:    vn.wert,
    zahlungszweck: zw.wert,
    steuerid:      st.wert,
    risiko:        visionResult.risiko,
    aktionen:      visionResult.aktionen,
  };

  const scores: Record<keyof ExtractedFields, number> = {
    titel:         titelResult.score,
    typ:           scoreTyp(visionResult.typ, rohText),
    absender:      scoreAbsender(visionResult.absender, rohText),
    betrag:        scoreBetrag(visionResult.betrag, rohText),
    frist:         scoreFrist(visionResult.frist, rohText),
    iban:          iban ? 95 : 0,
    aktenzeichen:  a.score,
    kundennr:      k.score,
    rechnungsnr:   r.score,
    vertragsnr:    vn.score,
    zahlungszweck: zw.score,
    steuerid:      st.score,
    risiko:        85,
    aktionen:      80,
  };

  const fields: AutoFillField[] = (Object.keys(FIELD_META) as (keyof ExtractedFields)[])
    .map(key => ({
      key,
      label:           FIELD_META[key].label,
      icon:            FIELD_META[key].icon,
      wert:            extracted[key] as string | number | null,
      confidence:      scoreToConfidence(scores[key]),
      confidenceScore: scores[key],
      quelle:          scores[key] >= 80 ? 'ocr_regex' : scores[key] >= 55 ? 'pattern_engine' : 'nlp_inference',
      editierbar:      FIELD_META[key].editierbar,
      erforderlich:    FIELD_META[key].erforderlich,
    }))
    .filter(f => f.wert !== null || f.erforderlich);

  const reqKeys = PFLICHT_FELDER[extracted.typ] || PFLICHT_FELDER.Sonstiges;
  const reqScores = reqKeys.map(k => scores[k]);
  const gesamtConfidence = reqScores.length > 0
    ? Math.round(reqScores.reduce((s, v) => s + v, 0) / reqScores.length)
    : 60;

  const fehlendePflichtfelder = reqKeys
    .filter(k => scores[k] === 0)
    .map(k => FIELD_META[k].label);

  const korrekturVorschlaege = buildKorrekturVorschlaege(extracted, rohText);

  return {
    fields,
    extracted,
    gesamtConfidence,
    fehlendePflichtfelder,
    korrekturVorschlaege,
    verarbeitungsDauer: Date.now() - start,
  };
}
