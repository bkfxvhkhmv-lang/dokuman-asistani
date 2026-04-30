export function validiereIBAN(iban: string): boolean {
  if (!iban || iban.length < 15 || iban.length > 34) return false;
  const umgestellt = iban.slice(4) + iban.slice(0, 4);
  const zahlen = umgestellt.split('').map(c => {
    const code = c.charCodeAt(0);
    return code >= 65 ? String(code - 55) : c;
  }).join('');
  let rest = 0;
  for (const ziffer of zahlen) {
    rest = (rest * 10 + parseInt(ziffer)) % 97;
  }
  return rest === 1;
}

export function extrahiereIBAN(text: string): string | null {
  const matches = text.match(/[A-Z]{2}\d{2}[\s]?([A-Z0-9]{4}[\s]?){4,7}/g);
  if (!matches) return null;
  for (const raw of matches) {
    const iban = raw.replace(/\s/g, '');
    if (validiereIBAN(iban)) return iban;
  }
  return null;
}
