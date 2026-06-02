import * as MailComposer from 'expo-mail-composer';
import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';
import { formatBetrag, formatFrist, genEinspruchText, exportierePDFZuDatei } from '@/utils';
import { openBankingAppWithPayment } from '@/services/formFillerService';
import type { Dokument } from '@/store';
import { safeDisplayTitel } from '@/utils/displaySanitizer';

type DokumentErweitert = Dokument;

function displayTitleFor(dok: DokumentErweitert): string {
  return safeDisplayTitel(dok.titel, dok.typ, dok.confidence);
}

function hasKnownSender(dok: DokumentErweitert): boolean {
  return !!(dok.absender && !/^unbekannt/i.test(dok.absender.trim()));
}

function buildFallbackSubject(dok: DokumentErweitert): string {
  const lang = getLangSync();
  const title = displayTitleFor(dok);
  const genericTitle = /^unbekannt/i.test(title) ? t(lang, 'display.fallback.document') : title;
  if (hasKnownSender(dok)) return t(lang, 'action_flow.fallback_subject_sender', { sender: dok.absender!.trim(), title: genericTitle });
  return t(lang, 'action_flow.fallback_subject_review', { title: genericTitle });
}

// Only feminine nouns that are grammatically safe with "die" — everything else uses "das Dokument".
const DIE_TYPEN = new Set(['Rechnung', 'Mahnung', 'Versicherung', 'Abrechnung', 'Nebenkostenabrechnung']);

function buildFallbackBody(dok: DokumentErweitert): string {
  const lang = getLangSync();
  const label = DIE_TYPEN.has(dok.typ ?? '')
    ? t(lang, 'action_flow.fallback_doc_label_type', { type: dok.typ ?? t(lang, 'display.fallback.document') })
    : t(lang, 'action_flow.fallback_doc_label_document');

  const hintParts = [
    dok.frist ? t(lang, 'action_flow.hint_deadline', { date: formatFrist(dok.frist) }) : null,
    dok.betrag ? t(lang, 'action_flow.hint_amount', { amount: formatBetrag(dok.betrag) ?? '' }) : null,
    dok.aktenzeichen ? t(lang, 'action_flow.hint_reference', { reference: dok.aktenzeichen }) : null,
  ].filter(Boolean);

  return [
    t(lang, 'action_flow.mail_greeting'),
    '',
    t(lang, 'action_flow.fallback_body_intro', { label }),
    ...(hintParts.length ? ['', t(lang, 'action_flow.fallback_body_hint', { hints: hintParts.join(' · ') })] : []),
    '',
    t(lang, 'action_flow.mail_signoff'),
  ].join('\n');
}

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
    subjectTemplate: ({ dok }) => t(getLangSync(), 'action_flow.profile.finanzamt.subject', {
      refPart: dok.aktenzeichen ? ` — AZ ${dok.aktenzeichen}` : '',
      title: displayTitleFor(dok),
    }),
    bodyTemplate: ({ dok }) =>
      t(getLangSync(), 'action_flow.profile.finanzamt.body', {
        title: displayTitleFor(dok),
        referenceLine: dok.aktenzeichen ? `\n${t(getLangSync(), 'action_flow.reference_line', { reference: dok.aktenzeichen })}` : '',
      }),
  },
  {
    match: /ordnungsamt|stadt|bußgeldstelle/i,
    preferredChannel: 'email', requiresAttachment: true,
    subjectTemplate: ({ dok }) => t(getLangSync(), 'action_flow.profile.authority.subject', {
      refPart: dok.aktenzeichen ? ` — ${dok.aktenzeichen}` : '',
    }),
    bodyTemplate: ({ dok }) =>
      t(getLangSync(), 'action_flow.profile.authority.body', {
        title: displayTitleFor(dok),
        referenceLine: dok.aktenzeichen ? `\n${t(getLangSync(), 'action_flow.reference_line', { reference: dok.aktenzeichen })}` : '',
      }),
  },
  {
    match: /beitragsservice|ard zdf deutschlandradio/i,
    preferredChannel: 'email', requiresAttachment: true,
    subjectTemplate: ({ dok }) => t(getLangSync(), 'action_flow.profile.beitragsservice.subject', {
      refPart: dok.aktenzeichen ? ` — ${dok.aktenzeichen}` : '',
      title: displayTitleFor(dok),
    }),
    bodyTemplate: ({ dok }) =>
      t(getLangSync(), 'action_flow.profile.beitragsservice.body', {
        title: displayTitleFor(dok),
      }),
  },
  {
    match: /versicherung|assekuranz|krankenkasse/i,
    preferredChannel: 'email', requiresAttachment: true,
    subjectTemplate: ({ dok }) => t(getLangSync(), 'action_flow.profile.insurance.subject', {
      title: displayTitleFor(dok),
    }),
    bodyTemplate: ({ dok }) =>
      t(getLangSync(), 'action_flow.profile.insurance.body', {
        title: displayTitleFor(dok),
        referenceLine: dok.aktenzeichen ? `\n${t(getLangSync(), 'action_flow.reference_short_line', { reference: dok.aktenzeichen })}` : '',
      }),
  },
];

export function getInstitutionSendProfile(dok: DokumentErweitert): SendProfile {
  const absender = dok?.absender || '';
  const matched = INSTITUTION_SEND_PROFILES.find(p => p.match?.test(absender));
  if (matched) return matched;

  return {
    preferredChannel: 'email',
    requiresAttachment: true,
    subjectTemplate: ({ dok: d }) => buildFallbackSubject(d),
    bodyTemplate: ({ dok: d }) => buildFallbackBody(d),
  };
}

interface PaymentSheetOptions {
  partnerEmail?: string | null;
  onMarkPaid?: () => void | Promise<void>;
}

export function buildPaymentSheetData(dok: DokumentErweitert, { partnerEmail = null, onMarkPaid }: PaymentSheetOptions = {}) {
  const lang = getLangSync();
  return {
    title:        t(lang, 'payment.sheet.title'),
    amount:       dok.betrag ? formatBetrag(dok.betrag) : t(lang, 'payment.sheet.no_amount'),
    recipient:    dok.absender || t(lang, 'payment.sheet.unknown_recipient'),
    iban:         dok.iban || '',
    reference:    dok.aktenzeichen || displayTitleFor(dok) || '',
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
      const { downloadOriginalFileToCache } = await import('@/services/v4Api');
      const fileUri = await downloadOriginalFileToCache(dok.v4DocId, dok.dateiName || `${displayTitleFor(dok)}.pdf`);
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
  if (!available) throw new Error(t(getLangSync(), 'action_flow.mail_app_missing'));

  const attachments = await resolveMailAttachmentUris(dok);
  const draft = buildInstitutionMailDraft(dok);

  await MailComposer.composeAsync({
    subject:     draft.subject,
    body:        draft.body,
    attachments,
  });
}

export async function composePartnerPaymentNotice(dok: DokumentErweitert, partnerEmail?: string): Promise<void> {
  if (!partnerEmail) return;
  const lang = getLangSync();

  await MailComposer.composeAsync({
    recipients: [partnerEmail],
    subject: t(lang, 'action_flow.partner_payment.subject', { title: displayTitleFor(dok) }),
    body: t(lang, 'action_flow.partner_payment.body', {
      title: displayTitleFor(dok),
      amountLine: dok.betrag ? `${t(lang, 'payment.sheet.amount')}: ${formatBetrag(dok.betrag)}\n` : '',
      deadlineLine: dok.frist ? `${t(lang, 'action_flow.deadline_label')}: ${formatFrist(dok.frist)}\n` : '',
    }),
  });
}
