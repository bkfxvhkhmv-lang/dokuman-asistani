/**
 * Arama ekraninin ust seridi: input + V4 toggle + filtre butonu + iptal.
 *
 * "Akilli sorgular" icin AppInput, semantik arama icin V4 toggle,
 * gelismis filtre icin huni butonu, ekrandan cikmak icin iptal linki.
 */
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { AppInput } from '@/design/components';
import Icon from '@/components/Icon';
import { useT } from '@/hooks/useT';
import type { ThemeColors } from '@/ThemeContext';

interface Props {
  query: string;
  onChange: (text: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  v4Modus: boolean;
  filterAktiv: boolean;
  onToggleV4: () => void;
  onOpenFilter: () => void;
  onCancel: () => void;
  C: ThemeColors;
  S: any;
}

export default function SearchHeader({
  query, onChange, onClear, onSubmit,
  v4Modus, filterAktiv, onToggleV4, onOpenFilter, onCancel,
  C, S,
}: Props) {
  const { t } = useT();
  return (
    <View style={{ paddingHorizontal: S.md, paddingTop: S.sm, paddingBottom: S.sm, gap: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: C.textSecondary, letterSpacing: 0.2 }}>{t('search.question')}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1 }}>
        <AppInput
          variant="search"
          placeholder={t('common.search_placeholder')}
          value={query}
          onChangeText={onChange}
          onClear={onClear}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
        />
      </View>

      {/* V4 (semantik) modu toggle */}
      <TouchableOpacity
        style={{
          height: 44, paddingHorizontal: 12, borderRadius: 13, borderWidth: 0.5,
          borderColor:     v4Modus ? C.primary : C.border,
          backgroundColor: v4Modus ? C.primaryLight : C.bgCard,
          alignItems: 'center', justifyContent: 'center',
        }}
        onPress={onToggleV4}
      >
        <Icon name="bulb" size={16} color={v4Modus ? C.primaryDark : C.textTertiary} />
      </TouchableOpacity>

      {/* Gelismis filtre butonu */}
      <TouchableOpacity
        onPress={onOpenFilter}
        style={{
          width: 44, height: 44, borderRadius: 13, borderWidth: 0.5,
          borderColor:     filterAktiv ? C.primary : C.border,
          backgroundColor: filterAktiv ? C.primaryLight : C.bgCard,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="funnel" size={17} color={filterAktiv ? C.primaryDark : C.textTertiary} />
        {filterAktiv && (
          <View
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary,
            }}
          />
        )}
      </TouchableOpacity>

      {/* Geri donus */}
      <TouchableOpacity onPress={onCancel}>
        <Text style={{ fontSize: 14, color: C.primary, fontWeight: '500' }}>{t('search.cancel')}</Text>
      </TouchableOpacity>
      </View>
    </View>
  );
}
