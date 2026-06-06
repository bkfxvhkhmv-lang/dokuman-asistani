import { renderBriefkopf } from '@/features/reply-assistant/domain/renderBriefkopf';

/** Subset of stored personal info used for production letterhead (no AsyncStorage dep). */
export type LetterProfile = {
  vorname?: string;
  nachname?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
};

const UNKNOWN_RECIPIENT_RE = /^(unbekannt|unbekannter absender|unknown|n\/a|—|-)$/i;

export const SENDER_NAME_PLACEHOLDER = '[Ihr Name]';
export const SENDER_ADDRESS_PLACEHOLDER = '[Ihre Adresse]';
export const RECIPIENT_FALLBACK_GENERIC = '[Behörde / Stelle ergänzen]';
export const RECIPIENT_FALLBACK_FINANZAMT = 'Finanzamt';

export type ReplyRecipientSource = {
  absender?: string | null;
  confidence?: number | null;
  rohText?: string | null;
  aiSender?: string;
};

export function senderFromBilgiler(bilgiler?: LetterProfile): { name: string; adresse: string } {
  if (!bilgiler) {
    return { name: SENDER_NAME_PLACEHOLDER, adresse: SENDER_ADDRESS_PLACEHOLDER };
  }
  const vorname = bilgiler.vorname?.trim() ?? '';
  const nachname = bilgiler.nachname?.trim() ?? '';
  const strasse = bilgiler.strasse?.trim() ?? '';
  const plz = bilgiler.plz?.trim() ?? '';
  const ort = bilgiler.ort?.trim() ?? '';
  const name = [vorname, nachname].filter(Boolean).join(' ') || SENDER_NAME_PLACEHOLDER;
  const adresse = strasse
    ? [strasse, [plz, ort].filter(Boolean).join(' ')].filter(Boolean).join('\n')
    : SENDER_ADDRESS_PLACEHOLDER;
  return { name, adresse };
}

export function resolveReplyRecipient(
  source: ReplyRecipientSource,
  fallback: string,
): string {
  const resolved = (source.aiSender?.trim() || source.absender?.trim() || '');
  if (resolved && !UNKNOWN_RECIPIENT_RE.test(resolved)) {
    return resolved;
  }
  return fallback;
}

export type BuildProductionBriefkopfInput = {
  recipientSource: ReplyRecipientSource;
  recipientFallback?: string;
  bilgiler?: LetterProfile;
  datum: string;
};

export function buildProductionBriefkopf(input: BuildProductionBriefkopfInput): string {
  const { name, adresse } = senderFromBilgiler(input.bilgiler);
  const recipient = resolveReplyRecipient(
    input.recipientSource,
    input.recipientFallback ?? RECIPIENT_FALLBACK_GENERIC,
  );
  return renderBriefkopf({
    senderName: name,
    senderAdresse: adresse,
    empfaengerStelle: recipient,
    datum: input.datum,
  });
}

/** Final pass before copy/share/PDF — fills sender bracket placeholders when profile exists. */
export function finalizeLetterTextForExport(text: string, bilgiler?: LetterProfile): string {
  if (!bilgiler) return text;
  const { name, adresse } = senderFromBilgiler(bilgiler);
  let out = text;
  if (name !== SENDER_NAME_PLACEHOLDER) {
    out = out.replace(/\[Ihr Name\]/g, name);
  }
  if (adresse !== SENDER_ADDRESS_PLACEHOLDER) {
    out = out.replace(/\[Ihre Adresse\]/g, adresse);
  }
  return out;
}
