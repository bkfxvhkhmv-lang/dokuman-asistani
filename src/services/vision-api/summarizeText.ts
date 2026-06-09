export function erstelleZusammenfassung(
  text: string,
  typ: string,
  betrag: number | null,
  frist: string | null,
  absender: string,
): string {
  let s = ` Dokumenttyp: ${typ}\n\n`;
  s += `👤 Absender: ${absender}\n\n`;

  if (betrag) {
    s += `💰 Betrag: ${betrag.toFixed(2).replace('.', ',')} €\n\n`;
  } else {
    s += ` Betrag: Nicht erkannt – bitte prüfen Sie das Dokument manuell\n\n`;
  }

  if (frist) {
    const d = new Date(frist);
    s += ` Frist: ${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`;
  } else {
    s += ` Frist: Keine Frist erkannt\n\n`;
  }

  const rechnungsNrMatch = text.match(/(?:rechnungsnr|rechnungsnummer)[:\s]+(\d+)/i);
  if (rechnungsNrMatch) s += `🔢 Rechnungsnummer: ${rechnungsNrMatch[1]}\n\n`;

  s += `📌 Empfehlung: `;

  if (typ === 'Rechnung') {
    if (betrag) {
      s += `Bitte überweisen Sie ${betrag.toFixed(2).replace('.', ',')} € rechtzeitig.`;
      if (frist) {
        const d = new Date(frist);
        s += ` Die Zahlung ist bis zum ${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })} fällig.`;
      }
      s += ` Verwenden Sie dabei bitte die angegebene Rechnungsnummer als Verwendungszweck.`;
    } else {
      s += 'Bitte prüfen Sie den Betrag auf der Rechnung und zahlen Sie rechtzeitig.';
    }
  } else if (typ === 'Mahnung') {
    s += ' Dies ist eine Mahnung! Bitte begleichen Sie den offenen Betrag umgehend, um weitere Mahngebühren und rechtliche Schritte zu vermeiden.';
  } else if (typ === 'Bußgeld') {
    s += ' Sie haben zwei Optionen: 1) Zahlen Sie den Betrag innerhalb der Frist, 2) Legen Sie schriftlich Einspruch ein.';
  } else if (typ === 'Steuerbescheid') {
    s += ' Prüfen Sie den Bescheid sorgfältig auf Fehler. Bei Unstimmigkeiten haben Sie einen Monat Zeit für Einspruch.';
  } else if (typ === 'Kündigung') {
    s += ' Prüfen Sie die Kündigungsfristen und die Rechtswirksamkeit.';
  } else {
    s += 'Bitte dokumentieren Sie dieses Schreiben und beachten Sie eventuelle Fristen.';
  }

  return s;
}

export function erstelleKurzfassung(
  typ: string,
  betrag: number | null,
  frist: string | null,
  absender: string,
): string {
  const betragStr = betrag ? `${betrag.toFixed(2).replace('.', ',')} €` : null;
  const fristStr = frist
    ? new Date(frist).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
    : null;

  if (typ === 'Rechnung') {
    if (betragStr && fristStr) return `${betragStr} bis ${fristStr} an ${absender} zahlen.`;
    if (betragStr) return `Rechnung über ${betragStr} von ${absender}.`;
    return `Rechnung von ${absender}.`;
  }
  if (typ === 'Mahnung') {
    if (betragStr && fristStr) return `Mahnung: ${betragStr} sofort bis ${fristStr} begleichen.`;
    if (betragStr) return `Mahnung über ${betragStr} von ${absender}.`;
    return `Mahnung von ${absender} – sofortige Zahlung erforderlich.`;
  }
  if (typ === 'Bußgeld') {
    if (betragStr && fristStr) return `Bußgeld ${betragStr} – zahlen oder Einspruch bis ${fristStr}.`;
    if (betragStr) return `Bußgeldbescheid über ${betragStr} von ${absender}.`;
    return `Bußgeldbescheid von ${absender}.`;
  }
  if (typ === 'Steuerbescheid') {
    if (betragStr && fristStr) return `Steuernachzahlung ${betragStr} bis ${fristStr}.`;
    return `Steuerbescheid von ${absender}.`;
  }
  if (typ === 'Termin') {
    if (fristStr) return `Termin am ${fristStr} bei ${absender}.`;
    return `Terminbestätigung von ${absender}.`;
  }
  if (typ === 'Kündigung') {
    if (fristStr) return `Kündigung von ${absender} – Frist ${fristStr}.`;
    return `Kündigungsschreiben von ${absender}.`;
  }
  if (typ === 'Versicherung') return `Versicherungsdokument von ${absender}.`;
  if (typ === 'Vertrag') return `Vertrag mit ${absender}.`;
  if (fristStr) return `Schreiben von ${absender} – Frist ${fristStr}.`;
  return `Schreiben von ${absender}.`;
}
