import React, { useState, useMemo } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../ThemeContext';
import { formatFrist, formatBetrag } from '../utils';
import { getBilgiler, platzhalterDoldur } from '../services/kisiselBilgi';
import type { Dokument } from '../store';

interface Sablon {
  id: string;
  label: string;
  icon: string;
  typen: string[];
  hinweis: string;
  text: string;
}

function buildSablonlar(dok?: Dokument): Sablon[] {
  const absender  = dok?.absender || '[Behörde/Gläubiger]';
  const titel     = dok?.titel    || '[Betreff]';
  const betrag    = dok?.betrag   ? formatBetrag(dok.betrag) : '[Betrag]';
  const frist     = dok?.frist    ? formatFrist(dok.frist)   : '[Datum]';
  const heute     = new Date().toLocaleDateString('de-DE');
  const aktBescheid = dok?.aktenzeichen || '[Aktenzeichen]';

  return [
    {
      id: 'widerspruch', label: 'Widerspruch einlegen', icon: '✍️',
      typen: ['Behörde', 'Steuerbescheid', 'Bußgeld', 'Mahnung'],
      hinweis: 'Frist: 30 Tage (VwGO §70) / 14 Tage bei Bußgeld (OWiG §67)',
      text: `Absender: [Ihr Name]\n[Ihre Adresse]\n[PLZ Ort]\n\n${absender}\n[Adresse der Behörde]\n\nDatum: ${heute}\n\nBetreff: Widerspruch gegen ${titel}\nAktenzeichen: ${aktBescheid}\n\nSehr geehrte Damen und Herren,\n\nhiermit lege ich fristgerecht Widerspruch gegen den oben genannten Bescheid vom ${frist} ein.\n\nBegründung:\nDer Bescheid ist aus folgenden Gründen fehlerhaft:\n[Ihre Begründung]\n\nIch bitte Sie, den Bescheid zu überprüfen und mir das Ergebnis schriftlich mitzuteilen.\n\nMit freundlichen Grüßen\n[Ihr Name]\n[Datum]`,
    },
    {
      id: 'stundung', label: 'Stundungsantrag (Zahlungsaufschub)', icon: '📅',
      typen: ['Rechnung', 'Mahnung', 'Steuerbescheid'],
      hinweis: 'Zahlung kann nicht sofort geleistet werden — Aufschub beantragen',
      text: `Absender: [Ihr Name]\n[Ihre Adresse]\n\n${absender}\n\nDatum: ${heute}\n\nBetreff: Antrag auf Stundung — ${titel}\nAktenzeichen: ${aktBescheid}\n\nSehr geehrte Damen und Herren,\n\nbezüglich der offenen Zahlung in Höhe von ${betrag} (fällig am ${frist}) beantrage ich hiermit eine Stundung bis zum [Neues Datum].\n\nGrund: [Kurze Begründung, z. B. finanzielle Engpässe, Krankheit]\n\nIch versichere, den Betrag bis zum beantragten Datum vollständig zu begleichen.\n\nFür Rückfragen stehe ich gerne zur Verfügung.\n\nMit freundlichen Grüßen\n[Ihr Name]`,
    },
    {
      id: 'ratenzahlung', label: 'Ratenzahlungsantrag', icon: '💳',
      typen: ['Rechnung', 'Mahnung', 'Steuerbescheid', 'Bußgeld'],
      hinweis: 'Betrag in mehreren Raten bezahlen',
      text: `Absender: [Ihr Name]\n[Ihre Adresse]\n\n${absender}\n\nDatum: ${heute}\n\nBetreff: Antrag auf Ratenzahlung — ${titel}\n\nSehr geehrte Damen und Herren,\n\nbezüglich des Betrages in Höhe von ${betrag} bitte ich um die Möglichkeit einer Ratenzahlung.\n\nIch schlage folgende Ratenzahlung vor:\n• Erste Rate: [Betrag] ab [Datum]\n• Monatliche Raten: [Betrag] jeweils zum [Tag] des Monats\n\nGrund: [Kurze Begründung]\n\nBitte teilen Sie mir mit, ob diesem Antrag stattgegeben werden kann.\n\nMit freundlichen Grüßen\n[Ihr Name]`,
    },
    {
      id: 'bestaetigung', label: 'Eingangsbestätigung', icon: '📬',
      typen: ['Behörde', 'Versicherung', 'Vertrag'],
      hinweis: 'Erhalt des Schreibens schriftlich bestätigen',
      text: `Absender: [Ihr Name]\n[Ihre Adresse]\n\n${absender}\n\nDatum: ${heute}\n\nBetreff: Eingangsbestätigung — ${titel}\n\nSehr geehrte Damen und Herren,\n\nhiermit bestätige ich den Erhalt Ihres Schreibens vom ${frist} zum oben genannten Betreff.\n\nIch werde mich innerhalb der gesetzlichen Frist bei Ihnen melden.\n\nMit freundlichen Grüßen\n[Ihr Name]`,
    },
    {
      id: 'kuendigung', label: 'Kündigung', icon: '✂️',
      typen: ['Vertrag', 'Versicherung'],
      hinweis: 'Vertrag oder Versicherung kündigen',
      text: `Absender: [Ihr Name]\n[Ihre Adresse]\n[Kundennummer]\n\n${absender}\n\nDatum: ${heute}\n\nBetreff: Kündigung — ${titel}\n\nSehr geehrte Damen und Herren,\n\nhiermit kündige ich den oben genannten Vertrag/die Versicherung fristgerecht zum nächstmöglichen Termin, spätestens jedoch zum [Datum].\n\nBitte senden Sie mir eine schriftliche Kündigungsbestätigung zu.\n\nMit freundlichen Grüßen\n[Ihr Name]`,
    },
    {
      id: 'nachfrage', label: 'Rückfrage / Klärung', icon: '❓',
      typen: ['Behörde', 'Versicherung', 'Rechnung', 'Sonstiges'],
      hinweis: 'Sachverhalt klären oder Informationen anfordern',
      text: `Absender: [Ihr Name]\n[Ihre Adresse]\n\n${absender}\n\nDatum: ${heute}\n\nBetreff: Rückfrage zu ${titel}\nAktenzeichen: ${aktBescheid}\n\nSehr geehrte Damen und Herren,\n\nbezüglich Ihres Schreibens vom ${frist} habe ich folgende Rückfragen:\n\n1. [Ihre Frage]\n2. [Weitere Frage]\n\nBitte antworten Sie mir schriftlich bis zum [Datum].\n\nMit freundlichen Grüßen\n[Ihr Name]`,
    },
  ];
}

interface YanıtSablonlariModalProps {
  visible: boolean;
  onClose: () => void;
  dok?: Dokument;
}

export default function YanıtSablonlariModal({ visible, onClose, dok }: YanıtSablonlariModalProps) {
  const { Colors, S, R } = useTheme();
  const C = Colors;
  const [secilenSablon, setSecilenSablon] = useState<Sablon | null>(null);
  const [editText, setEditText] = useState('');

  const sablonlar = useMemo(() => buildSablonlar(dok), [dok]);
  const passeneSablonlar = dok ? sablonlar.filter(s => s.typen.includes(dok.typ)) : sablonlar;
  const restlicheSablonlar = sablonlar.filter(s => !passeneSablonlar.includes(s));

  const handleWahl = async (sablon: Sablon) => {
    setSecilenSablon(sablon);
    const bilgiler = await getBilgiler();
    setEditText(platzhalterDoldur(sablon.text, bilgiler));
  };

  const handleKopieren = async () => { await Clipboard.setStringAsync(editText); };
  const handleTeilen   = async () => { await Share.share({ message: editText, title: secilenSablon?.label }); };
  const handleZurueck  = () => { setSecilenSablon(null); setEditText(''); };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', paddingBottom: 32 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
        {!secilenSablon ? (
          <>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, paddingHorizontal: 20, marginBottom: 4 }}>Antwortvorlage wählen</Text>
            <Text style={{ fontSize: 12, color: C.textSecondary, paddingHorizontal: 20, marginBottom: 16 }}>Vorlage auswählen und anpassen</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              {passeneSablonlar.length > 0 && (
                <>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: C.primary, letterSpacing: 0.8, marginBottom: 8 }}>FÜR DIESEN DOKUMENTTYP</Text>
                  {passeneSablonlar.map(s => (
                    <TouchableOpacity key={s.id} onPress={() => handleWahl(s)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, marginBottom: 8, backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: C.primary + '44' }}>
                      <Text style={{ fontSize: 26 }}>{s.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: C.primaryDark }}>{s.label}</Text>
                        <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{s.hinweis}</Text>
                      </View>
                      <Text style={{ fontSize: 16, color: C.primary }}>›</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {restlicheSablonlar.length > 0 && (
                <>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8, marginTop: 12, marginBottom: 8 }}>WEITERE VORLAGEN</Text>
                  {restlicheSablonlar.map(s => (
                    <TouchableOpacity key={s.id} onPress={() => handleWahl(s)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, marginBottom: 8, backgroundColor: C.bgInput, borderWidth: 0.5, borderColor: C.border }}>
                      <Text style={{ fontSize: 24 }}>{s.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{s.label}</Text>
                        <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>{s.hinweis}</Text>
                      </View>
                      <Text style={{ fontSize: 16, color: C.textTertiary }}>›</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, gap: 10 }}>
              <TouchableOpacity onPress={handleZurueck}>
                <Text style={{ fontSize: 15, color: C.primary }}>← Zurück</Text>
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: C.text }}>{secilenSablon.icon} {secilenSablon.label}</Text>
            </View>
            <View style={{ marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: C.warningLight, borderWidth: 0.5, borderColor: C.warning }}>
              <Text style={{ fontSize: 11, color: C.warningText }}>
                 Unverbindliche Vorlage — bitte [Platzhalter] ersetzen. Für Rechtssicherheit empfehlen wir einen Anwalt.
              </Text>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <TextInput style={{ backgroundColor: C.bgInput, borderRadius: 12, borderWidth: 1, borderColor: C.border, color: C.text, fontSize: 13, padding: 14, lineHeight: 20, minHeight: 320 }}
                value={editText} onChangeText={setEditText} multiline textAlignVertical="top" />
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 8 }}>
              <TouchableOpacity onPress={handleKopieren}
                style={{ flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: C.primary, backgroundColor: C.primaryLight }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.primaryDark }}>📋 Kopieren</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleTeilen}
                style={{ flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: C.primary }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>⬆ Teilen</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}
