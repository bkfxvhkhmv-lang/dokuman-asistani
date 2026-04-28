import * as MailComposer from 'expo-mail-composer';
import { formatBetrag, formatFrist, genEinspruchText, exportierePDFZuDatei } from '../../../utils';
import { openBankingAppWithPayment } from '../../../services/formFillerService';
import type { Dokument } from '../../../store';

type DokumentErweitert = Dokument;

export interface SendProfile {
  match?: RegExp;
  preferredChannel: string;
  requiresAttachment: boolean;
  subjectTemplate: (ctx: { dok: DokumentErweitert }) => string;
  bodyTemplate: (ctx: { dok: DokumentErweitert }) => string;
}

const INSTITUTION_SEND_PROFILES: SendProfile[] = [
  {
    match: /finanzamt/i,
    preferredChannel: 'email', requiresAttachment: true,
    subjectTemplate: ({ dok }) => `Steuersache${dok.aktenzeichen ? ` — AZ ${dok.aktenzeichen}` : ''} — ${dok.titel}`,
    bodyTemplate: ({ dok }) =>
      `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie das Dokument "${dok.titel}".${
        dok.aktenzeichen ? `\nAktenzeichen: ${dok.aktenzeichen}` : ''
      }\n\nBitte bestätigen Sie kurz den Eingang.\n\nMit freundlichen Grüßen`,
  },
  {
    match: /ordnungsamt|stadt|bußgeldstelle/i,
    preferredChannel: 'email', requiresAttachment: true,
    subjectTemplate: ({ dok }) => `Rückmeldung zum Vorgang${dok.aktenzeichen ? ` — ${dok.aktenzeichen}` : ''}`,
    bodyTemplate: ({ dok }) =>
      `Sehr geehrte Damen und Herren,\n\nbezugnehmend auf "${dok.titel}" übersende ich Ihnen das beigefügte Dokument.${
        dok.aktenzeichen ? `\nAktenzeichen: ${dok.aktenzeichen}` : ''
      }\n\nMit freundlichen Grüßen`,
  },
  {
    match: /beitragsservice|ard zdf deutschlandradio/i,
    preferredChannel: 'email', requiresAttachment: true,
    subjectTemplate: ({ dok }) => `Beitragsservice${dok.aktenzeichen ? ` — ${dok.aktenzeichen}` : ''} — ${dok.titel}`,
    bodyTemplate: ({ dok }) =>
      `Sehr geehrte Damen und Herren,\n\nim Anhang finden Sie die Unterlagen zu "${dok.titel}".\n\nIch bitte um kurze Rückmeldung zum Eingang.\n\nMit freundlichen Grüßen`,
  },
  {
    match: /versicherung|assekuranz|krankenkasse/i,
    preferredChannel: 'email', requiresAttachment: true,
    subjectTemplate: ({ dok }) => `Unterlagen zu ${dok.titel}`,
    bodyTemplate: ({ dok }) =>
      `Guten Tag,\n\nanbei sende ich Ihnen die Unterlagen zu "${dok.titel}".${
        dok.aktenzeichen ? `\nReferenz: ${dok.aktenzeichen}` : ''
      }\n\nMit freundlichen Grüßen`,
  },
];

export function getInstitutionSendProfile(dok: DokumentErweitert): SendProfile {
  const absender = dok?.absender || '';
  const matched = INSTITUTION_SEND_PROFILES.find(p => p.match?.test(absender));
  if (matched) return matched;

  return {
    preferredChannel: 'email',
    requiresAttachment: true,
    subjectTemplate: ({ dok: d }) =>
      `${d.absender || 'Dokument'} — ${d.titel}${d.aktenzeichen ? ` — AZ ${d.aktenzeichen}` : ''}`,
    bodyTemplate: ({ dok: d }) =>
      `${d.zusammenfassung || ''}${d.betrag ? `\nBetrag: ${formatBetrag(d.betrag)}` : ''}${
        d.frist ? `\nFrist: ${formatFrist(d.frist)}` : ''
      }${d.aktenzeichen ? `\nAktenzeichen: ${d.aktenzeichen}` : ''}\n\nAnhang: beigefügt\n\n---\nErstellt mit BriefPilot`,
  };
}

interface PaymentSheetOptions {
  partnerEmail?: string | null;
  onMarkPaid?: () => void | Promise<void>;
}

export function buildPaymentSheetData(dok: DokumentErweitert, { partnerEmail = null, onMarkPaid }: PaymentSheetOptions = {}) {
  return {
    title:        'Zahlung vorbereiten',
    amount:       dok.betrag ? formatBetrag(dok.betrag) : 'Kein Betrag erkannt',
    recipient:    dok.absender || 'Unbekannter Empfänger',
    iban:         dok.iban || '',
    reference:    dok.aktenzeichen || dok.titel || '',
    partnerEmail,
    onOpenBanking: () => openBankingAppWithPayment(dok),
    onMarkPaid,
  };
}

export function buildEinspruchSheetText(dok: DokumentErweitert): string {
  return genEinspruchText(dok);
}

export async function resolveMailAttachmentUris(dok: DokumentErweitert): Promise<string[]> {
  if (dok.uri) return [dok.uri];

  try {
    if (dok.v4DocId) {
      const { downloadOriginalFileToCache } = await import('../../../services/v4Api');
      const fileUri = await downloadOriginalFileToCache(dok.v4DocId, dok.dateiName || `${dok.titel}.pdf`);
      return [fileUri];
    }
  } catch (e) {
    console.warn('[MailAttachment]', e);
  }

  const pdfUri = await exportierePDFZuDatei(dok);
  return [pdfUri];
}

export function buildInstitutionMailDraft(dok: DokumentErweitert) {
  const profile = getInstitutionSendProfile(dok);
  return {
    profile,
    subject: profile.subjectTemplate({ dok }),
    body:    profile.bodyTemplate({ dok }),
  };
}

export async function composeInstitutionMailWithAttachment(dok: DokumentErweitert): Promise<void> {
  const available = await MailComposer.isAvailableAsync();
  if (!available) throw new Error('Bitte richten Sie eine E-Mail-App ein.');

  const attachments = await resolveMailAttachmentUris(dok);
  const draft = buildInstitutionMailDraft(dok);

  await MailComposer.composeAsync({ ...draft, attachments });
}

export async function composePartnerPaymentNotice(dok: DokumentErweitert, partnerEmail?: string): Promise<void> {
  if (!partnerEmail) return;

  await MailComposer.composeAsync({
    recipients: [partnerEmail],
    subject: `Zahlung: ${dok.titel}`,
    body: `Hallo,\n\n${dok.titel}\n${dok.betrag ? `Betrag: ${formatBetrag(dok.betrag)}\n` : ''}${
      dok.frist ? `Frist: ${formatFrist(dok.frist)}\n` : ''
    }\n\n---\nBriefPilot`,
  });
}
