/**
 * V4 backend'inden gelen semantik arama sonucunu gosteren kart.
 *
 * Skor renk-kodlu yuzde olarak gosterilir (>= 70 yesil, >= 40 turuncu).
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { ThemeColors } from '@/ThemeContext';
import Highlight from '@/features/search/components/Highlight';
import type { SemanticResult } from '@/features/search/components/constants';
import { useT } from '@/hooks/useT';

interface Props {
  result: SemanticResult;
  query: string;
  onPress: () => void;
  C: ThemeColors;
}

export default function SemanticKarte({ result, query, onPress, C }: Props) {
  const { t: T } = useT();
  const score = result.score ?? 0;
  const scoreColor =
    score >= 0.7 ? C.success :
    score >= 0.4 ? C.warning : C.textTertiary;

  return (
    <TouchableOpacity
      style={{
        marginHorizontal: 16, marginBottom: 8,
        borderRadius: 14, padding: 14,
        backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border,
      }}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }} numberOfLines={1}>
            {result.title || result.filename || result.doc_id}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
            backgroundColor: scoreColor + '22', borderWidth: 0.5, borderColor: scoreColor,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: scoreColor }}>
            {(score * 100).toFixed(0)}%
          </Text>
        </View>
      </View>

      {result.snippet && (
        <Highlight text={result.snippet} query={query} color={C.primary} secondaryColor={C.textSecondary} />
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
        {result.doc_type && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: C.primaryLight }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: C.primaryDark }}>{result.doc_type}</Text>
          </View>
        )}
        {result.created_at && (
          <Text style={{ fontSize: 10, color: C.textTertiary }}>
            {new Date(result.created_at).toLocaleDateString('de-DE')}
          </Text>
        )}
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 10, color: C.textTertiary }}>{T('search.semantic_label')}</Text>
      </View>
    </TouchableOpacity>
  );
}
