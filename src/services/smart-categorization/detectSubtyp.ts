/** Alt kategori seçimi — metin ve absender sinyallerine göre */

export function detectSubtyp(typ: string, text: string, absender: string | null): string | null {
  const lower = text.toLowerCase();
  const abs = (absender || '').toLowerCase();

  if (typ === 'Rechnung') {
    if (/strom|gas|energie|kwh/.test(lower + abs)) return 'Strom/Gas';
    if (/wasser|abwasser/.test(lower + abs)) return 'Wasser';
    if (/miete|nebenkosten|mietkosten/.test(lower + abs)) return 'Miete/Nebenkosten';
    if (/telefon|handy|mobil|internet|dsl/.test(lower + abs)) return 'Telefon/Internet';
    if (/versicherung/.test(lower)) return 'Versicherung';
    if (/netflix|spotify|amazon|abo|abonnement/.test(lower + abs)) return 'Abonnement';
    if (/handwerk|reparatur|montage|installation/.test(lower)) return 'Handwerk/Reparatur';
    return 'Sonstige Rechnung';
  }
  if (typ === 'Mahnung') {
    if (/letzte\s+mahnung|inkasso|anwalt/i.test(text)) return '3. Mahnung / Letzte Mahnung';
    if (/2\.?\s*mahnung|zweite\s+mahnung/i.test(text)) return '2. Mahnung';
    return '1. Mahnung';
  }
  if (typ === 'Bußgeld') {
    if (/parkend|parkvergehen|parkplatz/i.test(text)) return 'Parkvergehen';
    if (/ordnungsamt/i.test(text + abs)) return 'Ordnungsamt';
    return 'Verkehrsdelikt';
  }
  if (typ === 'Steuerbescheid') {
    if (/einkommensteuer/i.test(text)) return 'Einkommensteuer';
    if (/umsatzsteuer/i.test(text)) return 'Umsatzsteuer';
    if (/grundsteuer/i.test(text)) return 'Grundsteuer';
    if (/gewerbesteuer/i.test(text)) return 'Gewerbesteuer';
    return 'Sonstiger Steuerbescheid';
  }
  if (typ === 'Versicherung') {
    if (/kfz|auto|fahrzeug/i.test(text + abs)) return 'Kfz-Versicherung';
    if (/kranken/i.test(text + abs)) return 'Krankenversicherung';
    if (/haftpflicht/i.test(text)) return 'Haftpflicht';
    if (/hausrat/i.test(text)) return 'Hausrat';
    return 'Sonstige Versicherung';
  }
  if (typ === 'Kündigung') {
    if (/miet/i.test(text)) return 'Mietvertrag';
    if (/arbeit|stell/i.test(text)) return 'Arbeitsvertrag';
    if (/mobil|handy|telefon/i.test(text)) return 'Mobilfunkvertrag';
    return 'Sonstige Kündigung';
  }
  if (typ === 'Vertrag') {
    if (/miet/i.test(text)) return 'Mietvertrag';
    if (/arbeit|arbeitsvertrag/i.test(text)) return 'Arbeitsvertrag';
    if (/mobil|handy/i.test(text + abs)) return 'Mobilfunk';
    if (/strom|gas/i.test(text + abs)) return 'Strom/Gas';
    return 'Sonstiger Vertrag';
  }
  if (typ === 'Behördenbescheid') {
    if (/ausländer/i.test(text + abs)) return 'Ausländerbehörde';
    if (/finanzamt/i.test(text + abs)) return 'Finanzamt';
    if (/jobcenter/i.test(text + abs)) return 'Jobcenter';
    if (/sozialamt/i.test(text + abs)) return 'Sozialamt';
    return 'Sonstiger Bescheid';
  }
  return null;
}
