import type { Dokument } from '@/store';

export const TYP_CHIPS: Record<string, Array<{ icon: string; text: string }>> = {
  Rechnung: [
    { icon: '💶', text: 'Muss ich wirklich zahlen?' },
    { icon: '📅', text: 'Bis wann muss ich reagieren?' },
    { icon: '💳', text: 'Gibt es Ratenzahlung?' },
    { icon: '❌', text: 'Kann ich widersprechen?' },
  ],
  Mahnung: [
    { icon: '⚖️', text: 'Ist die Forderung berechtigt?' },
    { icon: '❗', text: 'Was passiert wenn ich nicht zahle?' },
    { icon: '✍️', text: 'Wie formuliere ich einen Widerspruch?' },
    { icon: '💰', text: 'Sind die Mahnkosten zulässig?' },
  ],
  Bußgeld: [
    { icon: '✍️', text: 'Lohnt sich ein Einspruch?' },
    { icon: '⏰', text: 'Wie lange habe ich für den Einspruch?' },
    { icon: '⚖️', text: 'Wann brauche ich einen Anwalt?' },
    { icon: '💶', text: 'Kann ich reduzieren lassen?' },
  ],
  Steuerbescheid: [
    { icon: '✍️', text: 'Kann ich Einspruch einlegen?' },
    { icon: '❓', text: 'Was bedeutet dieser Bescheid?' },
    { icon: '⏰', text: 'Was sind meine Fristen?' },
    { icon: '🏛️', text: 'An wen wende ich mich?' },
  ],
  Vertrag: [
    { icon: '✂️', text: 'Wann kann ich kündigen?' },
    { icon: '🔄', text: 'Gibt es automatische Verlängerung?' },
    { icon: '📋', text: 'Was sind meine Hauptpflichten?' },
    { icon: '⚠️', text: 'Welche Klauseln sind riskant?' },
  ],
  Versicherung: [
    { icon: '🛡️', text: 'Bin ich ausreichend versichert?' },
    { icon: '📋', text: 'Was genau ist abgedeckt?' },
    { icon: '⏰', text: 'Wann verlängert es sich automatisch?' },
    { icon: '💶', text: 'Kann ich Prämie senken?' },
  ],
  Behördenbescheid: [
    { icon: '❓', text: 'Was muss ich jetzt tun?' },
    { icon: '✍️', text: 'Kann ich Widerspruch einlegen?' },
    { icon: '⏰', text: 'Welche Fristen gelten?' },
    { icon: '🏛️', text: 'An wen wende ich mich?' },
  ],
  Kündigung: [
    { icon: '⚖️', text: 'Ist die Kündigung wirksam?' },
    { icon: '✍️', text: 'Muss ich antworten?' },
    { icon: '📅', text: 'Was sind die Fristen?' },
    { icon: '🏛️', text: 'Welche Rechte habe ich?' },
  ],
};

const DEFAULT_CHIPS = [
  { icon: '❓', text: 'Was muss ich jetzt tun?' },
  { icon: '⏰', text: 'Bis wann muss ich reagieren?' },
  { icon: '💶', text: 'Muss ich wirklich zahlen?' },
  { icon: '✍️', text: 'Wie kann ich widersprechen?' },
];

export function getChipsForTyp(dok?: Dokument): Array<{ icon: string; text: string }> {
  return (dok && TYP_CHIPS[dok.typ]) || DEFAULT_CHIPS;
}
