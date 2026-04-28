import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@bp_kisisel_bilgi';

export interface BilgiAlan {
  id: string;
  label: string;
  placeholder: string;
  icon: string;
}

export interface Bilgiler {
  vorname?: string;
  nachname?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  email?: string;
  telefon?: string;
  geburtsdatum?: string;
  iban?: string;
  steuernummer?: string;
  kundennummer?: string;
  [key: string]: string | undefined;
}

export const BILGI_ALANLARI: BilgiAlan[] = [
  { id: 'vorname',      label: 'Vorname',              placeholder: 'Max',              icon: '👤' },
  { id: 'nachname',     label: 'Nachname',             placeholder: 'Mustermann',       icon: '👤' },
  { id: 'strasse',      label: 'Straße + Hausnummer',  placeholder: 'Musterstr. 12',    icon: '🏠' },
  { id: 'plz',          label: 'PLZ',                  placeholder: '50667',            icon: '📮' },
  { id: 'ort',          label: 'Ort',                  placeholder: 'Köln',             icon: '🏙️' },
  { id: 'email',        label: 'E-Mail',               placeholder: 'max@email.de',     icon: '📧' },
  { id: 'telefon',      label: 'Telefon',              placeholder: '+49 170 1234567',  icon: '📞' },
  { id: 'geburtsdatum', label: 'Geburtsdatum',         placeholder: '01.01.1990',       icon: '🎂' },
  { id: 'iban',         label: 'IBAN',                 placeholder: 'DE89 3704 0044 …', icon: '💳' },
  { id: 'steuernummer', label: 'Steuernummer',         placeholder: '123/456/78901',    icon: '📋' },
  { id: 'kundennummer', label: 'Kundennummer (allg.)', placeholder: 'KD-12345',         icon: '🔢' },
];

export async function getBilgiler(): Promise<Bilgiler> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveBilgiler(bilgiler: Bilgiler): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(bilgiler));
}

export function platzhalterDoldur(text: string, bilgiler: Bilgiler): string {
  if (!text || !bilgiler) return text;
  const {
    vorname = '', nachname = '', strasse = '', plz = '', ort = '',
    email = '', telefon = '', geburtsdatum = '', iban = '',
  } = bilgiler;
  const vollerName    = [vorname, nachname].filter(Boolean).join(' ') || '[Ihr Name]';
  const volleAdresse  = strasse ? `${strasse}\n${plz} ${ort}`.trim() : '[Ihre Adresse]';

  return text
    .replace(/\[Ihr Name\]/g,            vollerName)
    .replace(/\[Ihre Adresse\]/g,        volleAdresse)
    .replace(/\[PLZ Ort\]/g,             plz && ort ? `${plz} ${ort}` : '[PLZ Ort]')
    .replace(/\[Ihre E-Mail\]/g,         email        || '[Ihre E-Mail]')
    .replace(/\[Ihre Telefonnummer\]/g,  telefon      || '[Ihre Telefonnummer]')
    .replace(/\[Ihr Geburtsdatum\]/g,    geburtsdatum || '[Ihr Geburtsdatum]')
    .replace(/\[Ihre IBAN\]/g,           iban         || '[Ihre IBAN]');
}
