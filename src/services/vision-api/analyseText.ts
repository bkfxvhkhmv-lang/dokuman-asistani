import { extrahiereIBAN } from './ibanHelpers';
import { erstelleKurzfassung, erstelleZusammenfassung } from './summarizeText';
import type { DocumentAnalysis } from './types';

export function analysiereText(text: string): DocumentAnalysis {
  if (!text || text.trim().length < 5) {
    throw new Error('Kein Text erkannt. Bitte ein deutlicheres Foto aufnehmen.');
  }

  const lower = text.toLowerCase();

  let typ: string = 'Sonstiges';
  let risiko: 'hoch' | 'mittel' | 'niedrig' = 'niedrig';
  let aktionen: string[] = [];

  if (lower.includes('rechnung') || lower.includes('rechnungsdatum') || lower.includes('rechnungsnr') ||
      lower.includes('invoice') || lower.includes('mwst') || lower.includes('gesamtbetrag') ||
      lower.includes('einzelpreis') || lower.includes('endbetrag') || lower.includes('zwischensumme')) {
    typ = 'Rechnung'; risiko = 'mittel'; aktionen = ['zahlen', 'kalender'];
  } else if (lower.includes('mahnung') || lower.includes('zahlungserinnerung') || lower.includes('rückstand') || lower.includes('säumnis')) {
    typ = 'Mahnung'; risiko = 'hoch'; aktionen = ['zahlen', 'kalender'];
  } else if (lower.includes('bußgeld') || lower.includes('bussgeldbescheid') || lower.includes('ordnungswidrigkeit') || lower.includes('verwarnungsgeld')) {
    typ = 'Bußgeld'; risiko = 'hoch'; aktionen = ['zahlen', 'einspruch', 'kalender'];
  } else if (lower.includes('steuerbescheid') || lower.includes('finanzamt') || lower.includes('einkommensteuer')) {
    typ = 'Steuerbescheid'; risiko = 'hoch'; aktionen = ['zahlen', 'einspruch', 'kalender'];
  } else if (lower.includes('kündigung')) {
    typ = 'Kündigung'; risiko = 'hoch'; aktionen = ['einspruch', 'kalender'];
  } else if (lower.includes('termin') || lower.includes('vorladung')) {
    typ = 'Termin'; risiko = 'mittel'; aktionen = ['kalender'];
  } else if (lower.includes('versicherung') || lower.includes('police')) {
    typ = 'Versicherung'; risiko = 'niedrig'; aktionen = [];
  } else if (lower.includes('vertrag')) {
    typ = 'Vertrag'; risiko = 'niedrig'; aktionen = [];
  } else if (lower.includes('bescheid') || lower.includes('behörde')) {
    typ = 'Behördenbescheid'; risiko = 'mittel'; aktionen = ['kalender'];
  }

  let betrag: number | null = null;
  const betragPatterns = [
    /gesamtbetrag\s*[€£$]?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
    /endbetrag\s*[€£$]?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
    /betrag\s*[€£$]?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
    /zu\s+zahlen\s*[€£$]?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
    /summe\s*[€£$]?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
    /zwischensumme\s*[€£$]?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i,
    /(\d{1,6}(?:[.,]\d{1,2})?)\s*€/,
    /€\s*(\d{1,6}(?:[.,]\d{1,2})?)/,
    /gesamt\s*(\d{1,6}(?:[.,]\d{1,2})?)\s*€/i,
  ];

  for (const p of betragPatterns) {
    const m = text.match(p);
    if (m) {
      const val = parseFloat(m[1].replace(',', '.'));
      if (val > 0 && val < 999999) { betrag = val; break; }
    }
  }

  if (!betrag) {
    const m = text.match(/(?:gesamtbetrag|endbetrag|betrag)\s*[€£$]?\s*(\d{1,5})/i);
    if (m) betrag = parseFloat(m[1]);
  }

  let frist: string | null = null;
  let rechnungsDatum: string | null = null;

  const datumPatterns = [
    /rechnungsdatum[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,
    /rechnungsdatum[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{2,4})/i,
    /bis\s+(?:zum\s+)?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,
    /fällig\s+(?:am\s+)?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,
    /zahlungsfrist[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,
    /lieferdatum[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,
    /(\d{1,2})[.\-](\d{1,2})[.\-](20\d{2})/,
  ];

  for (const p of datumPatterns) {
    const m = text.match(p);
    if (m) {
      try {
        const tag   = parseInt(m[1]);
        const monat = parseInt(m[2]) - 1;
        let jahr  = parseInt(m[3]);
        if (jahr < 100) jahr = 2000 + jahr;
        if (tag >= 1 && tag <= 31 && monat >= 0 && monat <= 11 && jahr >= 2020) {
          if (p.toString().includes('rechnungsdatum')) {
            rechnungsDatum = new Date(jahr, monat, tag).toISOString();
          } else if (!frist) {
            frist = new Date(jahr, monat, tag).toISOString();
          }
          break;
        }
      } catch {
        /* noop */
      }
    }
  }

  if (!frist && rechnungsDatum) {
    const date = new Date(rechnungsDatum);
    date.setDate(date.getDate() + 14);
    frist = date.toISOString();
  }

  let absender = 'Unbekannter Absender';
  const absenderPatterns = [
    /inhaber[:\s]+([^\n]{5,60})/i,
    /([A-ZÄÖÜ][a-zA-ZäöüÄÖÜß\s&\-\.]{3,40}(?:GmbH|AG|KG|UG|e\.V\.|Ltd|mbH|Jochum))/m,
    /^([A-ZÄÖÜ][a-zA-ZäöüÄÖÜß\s&]{4,40})$/m,
  ];

  for (const p of absenderPatterns) {
    const m = text.match(p);
    if (m && m[1] && m[1].trim().length > 3) {
      absender = m[1].trim().replace(/\n/g, ' ').slice(0, 60);
      break;
    }
  }

  if (absender === 'Unbekannter Absender') {
    const satirlar = text.split('\n').map(l => l.trim()).filter(l => l.length > 4 && /[a-zA-ZäöüÄÖÜß]/.test(l));
    if (satirlar.length > 0) absender = satirlar[0].slice(0, 60);
  }

  const iban = extrahiereIBAN(text);
  const zusammenfassung = erstelleZusammenfassung(text, typ, betrag, frist, absender);
  const kurzfassung = erstelleKurzfassung(typ, betrag, frist, absender);

  return { typ, risiko, betrag, frist, absender, aktionen, zusammenfassung, kurzfassung, iban };
}
