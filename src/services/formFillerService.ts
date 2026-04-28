import * as Clipboard from 'expo-clipboard';
import * as MailComposer from 'expo-mail-composer';
import { Linking, Platform } from 'react-native';
import type { Dokument } from '../store';

export interface PaymentForm {
  empfaenger: string;
  iban: string;
  betrag: number | string;
  verwendung: string;
  datum: string;
}

export interface BankingResult {
  opened: boolean;
  copied: boolean;
  paymentText: string;
}

export function generateEinspruchText(dok: Dokument): string {
  const heute = new Date().toLocaleDateString('de-DE');
  return `
Ihr Zeichen: ${dok.aktenzeichen || '—'}
Datum: ${heute}

Sehr geehrte Damen und Herren,

hiermit lege ich Widerspruch gegen Ihren Bescheid vom ${dok.datum || '—'} ein.

Name:    ___________________________
Adresse: ___________________________
IBAN:    ${dok.iban || '___________________________'}

Begründung:
___________________________________________
___________________________________________

Mit freundlichen Grüßen,
___________________________
`.trim();
}

export function prefillPaymentForm(dok: Dokument): PaymentForm {
  return {
    empfaenger: dok.absender || '',
    iban:       dok.iban     || '',
    betrag:     dok.betrag   || '',
    verwendung: dok.aktenzeichen || dok.titel || '',
    datum:      new Date().toLocaleDateString('de-DE'),
  };
}

export function paymentFormToText(dok: Dokument): string {
  const pf = prefillPaymentForm(dok);
  return [
    `Empfänger: ${pf.empfaenger || '—'}`,
    `IBAN: ${pf.iban || '—'}`,
    `Betrag: ${pf.betrag || '—'}`,
    `Verwendung: ${pf.verwendung || '—'}`,
  ].join('\n');
}

export async function openBankingAppWithPayment(dok: Dokument): Promise<BankingResult> {
  const pf = prefillPaymentForm(dok);
  const paymentText = paymentFormToText(dok);
  await Clipboard.setStringAsync(paymentText);

  const encodedRecipient  = encodeURIComponent(pf.empfaenger || '');
  const encodedIban       = encodeURIComponent(pf.iban || '');
  const encodedAmount     = encodeURIComponent(String(pf.betrag || ''));
  const encodedReference  = encodeURIComponent(String(pf.verwendung || ''));

  const candidates: (string | null)[] = [
    `banking://payment?name=${encodedRecipient}&iban=${encodedIban}&amount=${encodedAmount}&reference=${encodedReference}`,
    'banking://payment',
    'banking://',
    Platform.OS === 'android' ? 'intent://payment#Intent;scheme=banking;end' : null,
  ];

  for (const url of candidates) {
    if (!url) continue;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) continue;
      await Linking.openURL(url);
      return { opened: true, copied: true, paymentText };
    } catch {
      // try next
    }
  }

  return { opened: false, copied: true, paymentText };
}

export async function copyFormToClipboard(dok: Dokument): Promise<string> {
  const text = generateEinspruchText(dok);
  await Clipboard.setStringAsync(text);
  return text;
}

export async function openMailWithForm(dok: Dokument): Promise<void> {
  const body = generateEinspruchText(dok);
  const available = await MailComposer.isAvailableAsync();
  if (!available) throw new Error('E-Mail nicht verfügbar');
  await MailComposer.composeAsync({
    subject: `Widerspruch — ${dok.absender || 'Behörde'} — ${dok.aktenzeichen || ''}`,
    body,
  });
}
