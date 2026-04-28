import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../ThemeContext';
import Icon from '../../../components/Icon';
import type { Dokument } from '../../../store';

const TYP_TEASER: Record<string, string> = {
  Rechnung:         'Betrag korrekt? Ratenzahlung möglich?',
  Mahnung:          'Forderung berechtigt? Was tun bei Nicht-Zahlung?',
  Bußgeld:          'Einspruch sinnvoll? Fristen beachten?',
  Steuerbescheid:   'Bescheid prüfen, Einspruch einlegen?',
  Vertrag:          'Kündigung, Verlängerung, Hauptpflichten?',
  Versicherung:     'Deckungsumfang, Laufzeit, Vergleich?',
  Behördenbescheid: 'Was ist zu tun? Widerspruch möglich?',
  Kündigung:        'Kündigung wirksam? Welche Rechte hast du?',
  Termin:           'Vorbereitung, Verschiebung, Folgen?',
};

interface ChatEntryBarProps {
  dok?: Dokument;
  onOpen: (initialText?: string) => void;
}

export default function ChatEntryBar({ dok, onOpen }: ChatEntryBarProps) {
  const { Colors: C, S, R, Shadow } = useTheme();
  const teaser = dok ? (TYP_TEASER[dok.typ] ?? 'Stell eine Frage zu diesem Dokument.') : '';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onOpen()}
      accessibilityRole="button"
      accessibilityLabel="Assistenten fragen"
      style={[st.card, {
        backgroundColor: C.primaryLight,
        borderColor: C.primary + '33',
        ...Shadow.sm,
        marginHorizontal: S.md,
        marginTop: S.lg,
        marginBottom: S.sm,
        borderRadius: R.xl,
      }]}
    >
      {/* Header */}
      <View style={st.header}>
        <View style={[st.iconWrap, { backgroundColor: C.primary }]}>
          <Icon name="chatbubble-ellipses-outline" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.primaryDark }}>
            Frag den Assistenten
          </Text>
          {!!teaser && (
            <Text style={{ fontSize: 11, color: C.primaryDark + 'AA', marginTop: 1 }} numberOfLines={1}>
              {teaser}
            </Text>
          )}
        </View>
        <Icon name="chevron-forward" size={16} color={C.primary} />
      </View>

      {/* Fake input */}
      <View style={[st.fakeInput, { backgroundColor: C.bg, borderColor: C.primary + '22' }]}>
        <Text style={{ fontSize: 13, color: C.textTertiary, flex: 1 }}>
          Was möchtest du wissen?
        </Text>
        <View style={[st.sendBtn, { backgroundColor: C.primary }]}>
          <Text style={{ color: '#fff', fontSize: 16, lineHeight: 20 }}>↑</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  card:      { borderWidth: 1, padding: 14 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconWrap:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fakeInput: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  sendBtn:   { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
