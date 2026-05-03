/**
 * Arama ekrani aciliska, sorgu yokken gosterilen "ana sayfa" gorunumu.
 *
 * Icerigi:
 *  - SCHNELLSUCHE chip'leri
 *  - Suchverlauf (zuletzt gesucht) listesi + temizleme dugmesi
 *  - Etiketten chip'leri
 */
import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import type { ThemeColors } from '@/ThemeContext';
import SpringChip from '@/features/search/components/SpringChip';
import { SCHNELLSUCHE, type ChipTone } from '@/features/search/components/constants';
import { SEARCH_MISSION_HINT } from '@/product/strategyCopy';

interface Props {
  suchVerlauf: string[];
  setSuchVerlauf: (v: string[]) => void;
  etikettenVerlauf: string[];
  onSearch: (q: string) => void;
  C: ThemeColors;
  S: any;
}

function chipColors(tone: ChipTone | undefined, C: ThemeColors) {
  if (tone === 'danger')  return { bg: C.dangerLight,  border: C.dangerBorder,          text: C.danger };
  if (tone === 'warning') return { bg: C.warningLight, border: `${C.warning}55`,        text: C.warningText || C.warning };
  return                         { bg: C.bgCard,       border: C.border,                text: C.text };
}

export default function SearchHomeView({
  suchVerlauf, setSuchVerlauf, etikettenVerlauf, onSearch, C, S,
}: Props) {
  return (
    <ScrollView contentContainerStyle={{ padding: S.lg }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '500',
          color: C.textSecondary,
          lineHeight: 17,
          marginBottom: S.lg,
          letterSpacing: 0.05,
        }}
      >
        {SEARCH_MISSION_HINT}
      </Text>
      {/* Schnellsuche chip'leri */}
      <Text
        style={{
          fontSize: 10, fontWeight: '600',
          color: C.textTertiary, letterSpacing: 0.8,
          marginBottom: S.md,
        }}
      >
        SCHNELLSUCHE
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: S.xl }}>
        {SCHNELLSUCHE.map(t => {
          const pal = chipColors(t.tone, C);
          return (
            <SpringChip
              key={t.query}
              onPress={() => onSearch(t.query)}
              style={{
                paddingVertical: 8, paddingHorizontal: S.md, minHeight: 36,
                backgroundColor: pal.bg, borderRadius: 20,
                borderWidth: 0.5, borderColor: pal.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: t.tone ? '600' : '400', color: pal.text }}>{t.label}</Text>
            </SpringChip>
          );
        })}
      </View>

      {/* Zuletzt gesucht — silme onaysiz */}
      {suchVerlauf.length > 0 && (
        <>
          <View
            style={{
              flexDirection: 'row', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: S.md,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '600', color: C.textTertiary, letterSpacing: 0.8 }}>
              ZULETZT GESUCHT
            </Text>
            <TouchableOpacity onPress={() => setSuchVerlauf([])}>
              <Text style={{ fontSize: 11, color: C.danger }}>Löschen</Text>
            </TouchableOpacity>
          </View>
          {suchVerlauf.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                paddingVertical: 10,
                borderBottomWidth: 0.5, borderBottomColor: C.border,
              }}
              onPress={() => onSearch(s)}
            >
              <Icon name="clock" size={15} color={C.textTertiary} />
              <Text style={{ fontSize: 14, color: C.text, flex: 1 }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Etiket arama */}
      {etikettenVerlauf.length > 0 && (
        <>
          <Text
            style={{
              fontSize: 10, fontWeight: '600',
              color: C.textTertiary, letterSpacing: 0.8,
              marginTop: S.xl, marginBottom: S.md,
            }}
          >
            NACH ETIKETT SUCHEN
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {etikettenVerlauf.slice(0, 10).map(e => (
              <TouchableOpacity
                key={e}
                style={{
                  paddingVertical: 6, paddingHorizontal: 12,
                  backgroundColor: C.bgCard, borderRadius: 20,
                  borderWidth: 0.5, borderColor: C.border,
                }}
                onPress={() => onSearch(e)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon name="tag" size={11} color={C.textSecondary} />
                  <Text style={{ fontSize: 12, color: C.textSecondary }}>{e}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
