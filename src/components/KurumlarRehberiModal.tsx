import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useTheme } from '../ThemeContext';

interface KurumItem {
  name: string;
  info: string;
  url: string;
}

const KURUM_LISTE: Record<string, KurumItem[]> = {
  Rechnung: [
    { name: 'Verbraucherzentrale', info: 'Hilfe bei Rechnungen und Forderungen', url: 'https://www.verbraucherzentrale.de/' },
    { name: 'Schlichtungsstelle', info: 'Bei Streit mit Unternehmen', url: 'https://www.schlichtungstelle.de/' },
  ],
  Mahnung: [
    { name: 'Verbraucherzentrale', info: 'Prüfung von Mahnungen', url: 'https://www.verbraucherzentrale.de/' },
    { name: 'Schuldnerberatung', info: 'Beratung bei Zahlungsproblemen', url: 'https://www.caritas.de/hilfeundberatung/onlineberatung/schuldnerberatung/' },
  ],
  Bußgeld: [
    { name: 'Bußgeldstelle', info: 'Zuständige Behörde laut Bescheid', url: '' },
    { name: 'ADAC', info: 'Infos zu Verkehrsverstößen', url: 'https://www.adac.de/' },
  ],
  Behörde: [
    { name: 'Bürgeramt', info: 'Allgemeine Behördenanliegen', url: '' },
    { name: 'Verwaltungsportal', info: 'Digitale Behördenleistungen', url: 'https://verwaltung.bund.de/' },
  ],
  Termin: [
    { name: 'Zuständige Stelle', info: 'Termin verschieben oder bestätigen', url: '' },
  ],
  Versicherung: [
    { name: 'Verbraucherzentrale', info: 'Prüfung von Versicherungsbriefen', url: 'https://www.verbraucherzentrale.de/' },
    { name: 'Versicherungsombudsmann', info: 'Schlichtung bei Problemen', url: 'https://www.versicherungsombudsmann.de/' },
  ],
  Vertrag: [
    { name: 'Verbraucherzentrale', info: 'Vertragsprüfung und Widerruf', url: 'https://www.verbraucherzentrale.de/' },
  ],
  Sonstiges: [
    { name: 'Verbraucherzentrale', info: 'Allgemeine Beratung', url: 'https://www.verbraucherzentrale.de/' },
  ],
};

interface KurumlarRehberiModalProps {
  visible: boolean;
  onClose: () => void;
  dokTyp?: string;
}

export default function KurumlarRehberiModal({ visible, onClose, dokTyp }: KurumlarRehberiModalProps) {
  const { Colors: C } = useTheme();
  const liste = KURUM_LISTE[dokTyp ?? ''] ?? KURUM_LISTE.Sonstiges;

  return (
    <Modal visible={!!visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '78%' }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20, backgroundColor: C.border }} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 6 }}>Behörden & Institutionen</Text>
        <Text style={{ fontSize: 12, color: C.textSecondary, marginBottom: 16 }}>
          Passende Stellen für Dokumenttyp: {dokTyp || 'Sonstiges'}
        </Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {liste.map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => item.url ? Linking.openURL(item.url).catch(() => null) : null}
              style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, marginBottom: 10 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 }}>{item.name}</Text>
              <Text style={{ fontSize: 12, color: C.textSecondary }}>{item.info}</Text>
              {!!item.url && (
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.primary, marginTop: 6 }}>Website öffnen</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={onClose} style={{ marginTop: 8, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: C.border }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>Schließen</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
