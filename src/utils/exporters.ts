import { Share } from 'react-native';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system/legacy';
import { formatBetrag, formatFrist, formatDatum } from '@/utils/formatters';
import type { Dokument } from '@/store';
import { pdfRenderService } from '@/pdf';
import { buildHumanExportBasename, buildPdfExportBasename } from '@/utils/exportFilename';
import { normalizeDocumentTyp } from '@/product/canonicalDocTypes';
import { safeDisplayTitel } from '@/utils/displaySanitizer';
import {
  buildProductionBriefkopf,
  finalizeLetterTextForExport,
  RECIPIENT_FALLBACK_GENERIC,
  SENDER_NAME_PLACEHOLDER,
  type LetterProfile,
} from '@/features/detail/services/productionLetterhead';

/** Leere/fehlerhafte PDFs filtern (~nur Artefakte). */
const MIN_REASONABLE_PDF_BYTES = 400;

async function assertPdfLooksValid(uri: string): Promise<void> {
  const inf = await FileSystem.getInfoAsync(uri, { size: true } as any);
  const size = typeof (inf as { size?: number }).size === 'number' ? (inf as { size: number }).size : 0;
  if (!size || size < MIN_REASONABLE_PDF_BYTES) {
    throw new Error('BRIEFPILOT_PDF_TOO_SMALL');
  }
}

export async function shareDokument(dok: Dokument): Promise<void> {
  const displayTitle = safeDisplayTitel(dok.titel, dok.typ, (dok as any).confidence);
  const lines = [
    ` BriefPilot — ${displayTitle}`, `👤 ${dok.absender}`,
    dok.betrag ? ` Betrag: ${formatBetrag(dok.betrag as number)}` : null,
    dok.frist  ? ` Frist: ${formatFrist(dok.frist)}` : null,
    ``, dok.zusammenfassung, dok.warnung ? `\n ${dok.warnung}` : null,
  ].filter(Boolean).join('\n');
  await Share.share({ message: lines, title: displayTitle });
}

export function genEinspruchText(dok: Dokument, bilgiler?: LetterProfile): string {
  const heute = new Date().toLocaleDateString('de-DE');
  const displayTitle = safeDisplayTitel(dok.titel, dok.typ, (dok as any).confidence);
  const briefkopf = buildProductionBriefkopf({
    recipientSource: {
      absender: dok.absender,
      confidence: (dok as { confidence?: number | null }).confidence,
      rohText: (dok as { rohText?: string | null }).rohText,
      aiSender: (dok as { aiSender?: string }).aiSender,
    },
    recipientFallback: RECIPIENT_FALLBACK_GENERIC,
    bilgiler,
    datum: heute,
  });
  const betragLine = dok.betrag ? `Betrag: ${formatBetrag(dok.betrag as number)}\n\n` : '';
  const raw = `${briefkopf}Betreff: ${displayTitle}

Sehr geehrte Damen und Herren,

hiermit lege ich fristgerecht Einspruch gegen folgenden Bescheid ein:

${betragLine}Begründung:
[Bitte hier Ihre Begründung einfügen]

Ich bitte um schriftliche Eingangsbestätigung und Aussetzung der Vollziehung bis zur Entscheidung.

Mit freundlichen Grüßen

${SENDER_NAME_PLACEHOLDER}`;
  return finalizeLetterTextForExport(raw, bilgiler);
}

export async function sendEinspruchMail(dok: Dokument): Promise<boolean> {
  const isAvailable = await MailComposer.isAvailableAsync();
  if (!isAvailable) return false;
  const displayTitle = safeDisplayTitel(dok.titel, dok.typ, (dok as any).confidence);
  await MailComposer.composeAsync({ subject: `Einspruch: ${displayTitle}`, body: genEinspruchText(dok) });
  return true;
}

export async function exportiereEinspruchPDF(dok: Dokument, einspruchText: string): Promise<void> {
  const Print = await import('expo-print');
  const Sharing = await import('expo-sharing');
  const heute = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  const displayTitle = safeDisplayTitel(dok.titel, dok.typ, (dok as any).confidence);
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><style>body{font-family:Georgia,serif;max-width:680px;margin:60px auto;color:#222;font-size:14px;line-height:1.8}.header{border-bottom:2px solid #534AB7;padding-bottom:18px;margin-bottom:28px}.label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:4px}.betreff{font-size:16px;font-weight:bold;color:#534AB7;margin-bottom:24px}.body{white-space:pre-wrap}.footer{margin-top:40px;border-top:1px solid #eee;padding-top:16px;font-size:11px;color:#aaa;text-align:center}</style></head><body><div class="header"><div class="label">BriefPilot — Einspruch-Vorlage</div><h1 style="font-size:22px;margin:6px 0;color:#222;">${displayTitle}</h1><div style="color:#888;font-size:12px;">${dok.absender} &nbsp;·&nbsp; ${heute}</div></div><div class="betreff">Einspruch / Widerspruch</div><div class="body">${einspruchText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>')}</div><div class="footer">Erstellt mit BriefPilot · Unverbindliche Vorlage — kein Rechtsrat</div></body></html>`;
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const appealBase = buildHumanExportBasename({
    sender: dok.absender,
    title: dok.titel,
    type: `${dok.typ || 'Dokument'} Einspruch`,
    date: dok.datum,
    dueDate: dok.frist,
  });
  const dest = uri.replace(/\.pdf$/, '') + `_${appealBase}.pdf`;
  await FileSystem.moveAsync({ from: uri, to: dest });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(dest, { mimeType: 'application/pdf' });
}

/** Sayfa görüntüleri mevcut ve dosyalar okunabiliyorsa tarayıcı çıktılı PDF */
async function exportRasterPdfFromStoredPages(dok: Dokument): Promise<string | null> {
  const raw = dok.pages;
  if (!raw?.length) return null;

  const sorted = [...raw].sort((a, b) => a.order - b.order);
  try {
    const flags = await Promise.all(
      sorted.map(async (p) => {
        try {
          const info = await FileSystem.getInfoAsync(p.uri);
          return !!info.exists;
        } catch {
          return false;
        }
      }),
    );
    if (!flags.every(Boolean)) {
      console.warn('[exportRasterPdfFromStoredPages] Eksik sayfa dosyası — özet PDF’e düşülüyor');
      return null;
    }

    const result = await pdfRenderService.generate(
      sorted.map(p => ({
        uri: p.uri,
        width: p.width ?? undefined,
        height: p.height ?? undefined,
        ocrText: p.ocrText ?? undefined,
        rotation: p.rotation ?? 0,
      })),
      {
        profile: 'standard',
        metadata: {
          title: safeDisplayTitel(dok.titel, dok.typ, (dok as any).confidence),
          subject: dok.absender ?? undefined,
          documentType: dok.typ,
        },
      },
    );
    await assertPdfLooksValid(result.uri);
    return result.uri;
  } catch (e) {
    console.warn('[exportRasterPdfFromStoredPages]', e);
    return null;
  }
}

async function renderDokumentPdfToFile(dok: Dokument): Promise<{ uri: string }> {
  const Print = await import('expo-print');
  const fristStr  = dok.frist  ? formatFrist(dok.frist)   : '–';
  const betragStr = dok.betrag ? formatBetrag(dok.betrag as number) ?? '–' : '–';
  const datumStr  = formatDatum(dok.datum);
  const risikoFarbe: Record<string, string> = { hoch: '#E24B4A', mittel: '#BA7517', niedrig: '#1D9E75' };
  const risikoLabel: Record<string, string> = { hoch: 'Dringend', mittel: 'Diese Woche', niedrig: 'Kein Handlungsbedarf' };
  const farbe = risikoFarbe[dok.risiko ?? 'niedrig'] || '#1D9E75';
  const label = risikoLabel[dok.risiko ?? 'niedrig'] || '';
  const dok2 = dok as any;
  const displayTitel = safeDisplayTitel(dok.titel, dok.typ, dok2.confidence);
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1a1a2e;background:#fff;padding:40px}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #534AB7}.logo{font-size:26px;font-weight:800;color:#534AB7;letter-spacing:-0.5px}.logo span{color:#7C6EF8}.meta{text-align:right;font-size:11px;color:#888}.badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;color:#fff;background:${farbe};margin-bottom:12px}h1{font-size:22px;font-weight:800;color:#1a1a2e;margin-bottom:4px}.absender{font-size:13px;color:#888;margin-bottom:28px}.infobox{background:#f7f5ff;border:1.5px solid #534AB7;border-radius:12px;padding:20px;margin-bottom:24px;display:flex;gap:40px}.infobox-item label{font-size:10px;font-weight:700;letter-spacing:0.8px;color:#534AB7;display:block;margin-bottom:4px}.infobox-item .val{font-size:22px;font-weight:800;color:#534AB7}.infobox-item .val-sm{font-size:14px;font-weight:600;color:#534AB7}.section{margin-bottom:24px}.section-title{font-size:10px;font-weight:700;letter-spacing:0.8px;color:#aaa;margin-bottom:10px;text-transform:uppercase}.section-body{font-size:13px;color:#444;line-height:1.7;background:#fafafa;border-radius:10px;padding:16px;border:1px solid #eee;white-space:pre-wrap}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #eee;font-size:10px;color:#bbb;text-align:center}</style></head><body><div class="header"><div class="logo">Brief<span>Pilot</span></div><div class="meta">Exportiert am ${formatDatum(new Date().toISOString())}<br/>Erfasst am ${datumStr}${dok2.confidence != null ? `<br/><span style="font-size:11px;font-weight:700;color:${dok2.confidence >= 80 ? '#1D9E75' : dok2.confidence >= 55 ? '#BA7517' : '#E24B4A'}">OCR ${dok2.confidence}%</span>` : ''}</div></div><div class="badge">${label}</div><h1>${displayTitel}</h1><p class="absender">${dok.absender}</p><div class="infobox"><div class="infobox-item"><label>BETRAG</label><span class="val">${betragStr}</span></div><div class="infobox-item"><label>FRIST</label><span class="val-sm">${fristStr}</span></div><div class="infobox-item"><label>TYP</label><span class="val-sm">${dok.typ}</span></div></div>${dok2.iban ? `<div class="section"><div class="section-title">IBAN (verifiziert)</div><div class="section-body"><span style="font-family:monospace;font-size:14px;font-weight:600;color:#1D9E75;letter-spacing:2px">${dok2.iban.replace(/(.{4})/g,'$1 ').trim()}</span></div></div>` : ''}<div class="section"><div class="section-title">KI-ZUSAMMENFASSUNG</div><div class="section-body">${dok.zusammenfassung || '–'}</div></div>${dok.warnung ? `<div class="section"><div class="section-title">HINWEIS</div><div class="section-body">${dok.warnung}</div></div>` : ''}<div class="footer">BriefPilot v3.0.0 · Automatisch erstellt · Keine Rechtsberatung</div></body></html>`;
  return Print.printToFileAsync({ html, base64: false });
}

export async function exportierePDFZuDatei(dok: Dokument): Promise<string> {
  const raster = await exportRasterPdfFromStoredPages(dok);
  if (raster) return raster;

  const { uri } = await renderDokumentPdfToFile(dok);
  await assertPdfLooksValid(uri);
  return uri;
}

export async function exportierePDF(dok: Dokument): Promise<void> {
  const Sharing = await import('expo-sharing');
  const uri = await exportierePDFZuDatei(dok);
  const base = buildPdfExportBasename(dok);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('BRIEFPILOT_SHARING_UNAVAILABLE');
  }
  const dir = FileSystem.documentDirectory;
  if (!dir?.length) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: base });
    return;
  }
  const dest = `${dir}${base}.pdf`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: base });
}

export async function exportiereTopluPDF(dokumente: Dokument[]): Promise<string> {
  const Print = await import('expo-print');
  const Sharing = await import('expo-sharing');
  const risikoFarbe: Record<string, string> = { hoch: '#E24B4A', mittel: '#BA7517', niedrig: '#1D9E75' };
  const risikoLabel: Record<string, string> = { hoch: 'Dringend', mittel: 'Diese Woche', niedrig: 'Kein Handlungsbedarf' };
  const sayfalar = dokumente.map(dok => {
    const betragStr = dok.betrag ? formatBetrag(dok.betrag as number) : '–';
    const fristStr  = dok.frist  ? formatFrist(dok.frist)  : '–';
    const farbe = risikoFarbe[dok.risiko ?? 'niedrig'] || '#888';
    const label = risikoLabel[dok.risiko ?? 'niedrig'] || '';
    const dok2 = dok as any;
    return `<div class="dok"><div class="dok-header"><div><span class="badge" style="background:${farbe}">${label}</span><h2>${safeDisplayTitel(dok.titel, dok.typ, dok2.confidence)}</h2><p class="meta">${dok.absender} · ${formatDatum(dok.datum)}</p></div><div class="zahlen">${dok.betrag ? `<div class="betrag" style="color:${farbe}">${betragStr}</div>` : ''}${dok.frist ? `<div class="frist">${fristStr}</div>` : ''}</div></div>${dok2.kurzfassung ? `<p class="kurz">${dok2.kurzfassung}</p>` : ''}${dok2.iban ? `<p class="iban">IBAN: ${dok2.iban.replace(/(.{4})/g,'$1 ').trim()} ✓</p>` : ''}${dok.erledigt ? '<div class="erledigt">✓ Erledigt</div>' : ''}</div>`;
  }).join('<div class="trenner"></div>');
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1a1a2e;padding:32px}.report-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;border-bottom:2px solid #534AB7;margin-bottom:24px}.logo{font-size:22px;font-weight:800;color:#534AB7}.badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:700;color:#fff;margin-bottom:6px}h2{font-size:16px;font-weight:700;margin-bottom:2px}.meta{font-size:11px;color:#888}.zahlen{text-align:right}.betrag{font-size:20px;font-weight:800}.frist{font-size:11px;color:#888;margin-top:2px}.kurz{font-size:12px;color:#555;margin-top:6px;line-height:1.6}.iban{font-size:12px;color:#1D9E75;font-weight:600;margin-top:4px;font-family:monospace;letter-spacing:1px}.erledigt{display:inline-block;margin-top:6px;font-size:11px;font-weight:700;color:#1D9E75;background:#EAF3DE;padding:2px 10px;border-radius:999px}.trenner{border-top:1px solid #eee;margin:16px 0}.footer{margin-top:32px;padding-top:12px;border-top:1px solid #eee;font-size:10px;color:#bbb;text-align:center}</style></head><body><div class="report-header"><div class="logo">BriefPilot — Bericht</div><div style="font-size:11px;color:#888;text-align:right">${dokumente.length} Dokumente<br/>${formatDatum(new Date().toISOString())}</div></div>${sayfalar}<div class="footer">BriefPilot v3.0.0 · Automatisch erstellt · Keine Rechtsberatung</div></body></html>`;
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const mergedBase =
    dokumente.length === 1 ? buildPdfExportBasename(dokumente[0]) : `Sammel_${dokumente.length}_${new Date().toISOString().slice(0, 10)}`;

  // Copy to documentDirectory so Android's sharing can find the file.
  // shareUri starts as the temp printToFileAsync path; only updated if copy succeeds.
  const dest = `${FileSystem.documentDirectory ?? ''}${mergedBase}.pdf`;
  let shareUri = uri;
  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    shareUri = dest;
  } catch {
    // copy failed — fall back to the original temp URI
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('BRIEFPILOT_SHARING_UNAVAILABLE');
  }
  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    dialogTitle: `BriefPilot — ${dokumente.length} Dokument${dokumente.length !== 1 ? 'e' : ''}`,
    UTI: 'com.adobe.pdf',
  });
  return shareUri;
}

export async function exportiereDatavCSV(dokumente: Dokument[]): Promise<void> {
  const Sharing   = await import('expo-sharing');
  const header = ['Umsatz','Soll/Haben','WKZ','Kurs','Basisumsatz','Basis-WKZ','Konto','Gegenkonto','BU-Schlüssel','Belegdatum','Belegfeld1','Belegfeld2','Skonto','Buchungstext'].join(';');
  const KONTO_MAP: Record<string, string> = {
    Rechnung: '1600', Rechnungen: '1600',
    Mahnung: '1600', 'Mahnung / Zahlungserinnerung': '1600',
    Bußgeld: '4900', Behörde: '4900', 'Behörden / Amt': '4900',
    Steuerbescheid: '3800', Steuer: '3800',
    Termin: '4900', Versicherung: '4360',
    Vertrag: '4900', Verträge: '4900', Kündigung: '4900',
    Gesundheit: '4360', 'Schule / Kita': '4900',
    'Bank / Finanzen': '1800', 'Garantie / Kaufbeleg': '4900',
    Sonstiges: '4900',
  };
  const rows = dokumente.filter(d => d.betrag && (d.betrag as number) > 0).map(d => {
    const datum = d.datum ? new Date(d.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }).replace('.', '') : '';
    const betrag = (d.betrag as number).toFixed(2).replace('.', ',');
    const konto = KONTO_MAP[normalizeDocumentTyp(d.typ)] || KONTO_MAP[d.typ] || '4900';
    return [betrag, 'S', 'EUR', '', '', '', konto, '1200', '', datum, d.id.substring(0, 12), '', '', (d.titel || '').replace(/;/g, ',').substring(0, 60)].join(';');
  });
  const inhalt = [header, ...rows].join('\r\n');
  const dir = FileSystem.documentDirectory;
  if (!dir) throw new Error('Kein Speicherzugriff auf diesem Gerät.');
  const datePart = new Date().toISOString().slice(0, 10);
  const base =
    dokumente.length === 1
      ? buildHumanExportBasename({
          sender: dokumente[0].absender,
          title: dokumente[0].titel,
          type: 'Buchungen',
          date: dokumente[0].datum,
          dueDate: dokumente[0].frist,
        })
      : `BriefPilot_Buchungen_${datePart}`;
  const datei = `${dir}${base}.csv`;
  await FileSystem.writeAsStringAsync(datei, '﻿' + inhalt, { encoding: 'utf8' } as any);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(datei, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
  } else {
    // Android fallback: MediaLibrary veya native share sheet
    const { Share } = await import('react-native');
    await Share.share({ message: inhalt, title: `${base}.csv` });
  }
}
