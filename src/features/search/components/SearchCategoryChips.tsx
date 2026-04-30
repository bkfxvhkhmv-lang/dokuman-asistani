/**
 * Schnellfilter unter der Suche — Werte entsprechen `Dokument.typ` / „alle“.
 */
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SEARCH_CATEGORY_QUICK_CHIPS } from '@/product/canonicalDocTypes';
import type { ThemeColors } from '@/ThemeContext';

type Props = {
  typ: string;
  onTyp: (filter: string) => void;
  C: ThemeColors;
  /** theme spacing */
  S: { sm: number; md: number };
};

export default function SearchCategoryChips({ typ, onTyp, C, S }: Props) {
  return (
    <View style={{ marginBottom: S.sm }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.md, gap: 8 }}>
        {SEARCH_CATEGORY_QUICK_CHIPS.map(({ filter, label }) => {
          const aktiv = filter === typ;
          return (
            <TouchableOpacity
              key={filter}
              onPress={() => onTyp(filter)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: aktiv ? C.primary : C.border,
                backgroundColor: aktiv ? C.primaryLight : C.bgCard,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: aktiv ? '800' : '500', color: aktiv ? C.primaryDark : C.textSecondary }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
