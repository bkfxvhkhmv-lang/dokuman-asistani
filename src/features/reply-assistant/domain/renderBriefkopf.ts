export interface BriefkopfInput {
  senderName: string;
  senderAdresse: string;
  empfaengerStelle: string;
  empfaengerAdresse?: string;
  datum: string; // DD.MM.YYYY — caller computes, not this function
}

export function renderBriefkopf(input: BriefkopfInput): string {
  const parts: string[] = [
    input.senderName,
    input.senderAdresse,
    '',
    input.empfaengerStelle,
  ];
  if (input.empfaengerAdresse) parts.push(input.empfaengerAdresse);
  // Two trailing blank lines so copy output reads: ...Datum\n\nBetreff: ...
  parts.push('', input.datum, '', '');
  return parts.join('\n');
}
