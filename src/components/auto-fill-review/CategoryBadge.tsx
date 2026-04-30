import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { ThemeColors } from '@/ThemeContext';
import type { RadiusTokens } from '@/theme';
import type { CategoryResult } from '@/services/SmartCategorizationService';

interface CategoryBadgeProps {
  result: CategoryResult;
  C: ThemeColors;
  R: RadiusTokens;
  onAlt: (typ: string) => void;
}

export function CategoryBadge({ result, C, R, onAlt }: CategoryBadgeProps) {
  const [showAlts, setShowAlts] = useState(false);
  return (
    <View style={{
      backgroundColor: C.primaryLight, borderRadius: R.lg, padding: 14, marginBottom: 16,
      borderWidth: 1, borderColor: C.primary + '44',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.primaryDark, marginBottom: 2 }}>
            KI-ERKENNUNG
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>
            {result.institution?.icon ? `${result.institution.icon} ` : ''}{result.typ}
            {result.subtyp ? ` · ${result.subtyp}` : ''}
          </Text>
          {result.institution && (
            <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
              {result.institution.name}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={{
            backgroundColor: result.confidence >= 80 ? '#EAF3DE' : result.confidence >= 55 ? '#FAEEDA' : '#FCEBEB',
            borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
          }}>
            <Text style={{
              fontSize: 12, fontWeight: '800',
              color: result.confidence >= 80 ? '#1D9E75' : result.confidence >= 55 ? '#BA7517' : '#E24B4A',
            }}>
              {result.confidence}%
            </Text>
          </View>
          {result.alternatives.length > 0 && (
            <TouchableOpacity onPress={() => setShowAlts(v => !v)}>
              <Text style={{ fontSize: 11, color: C.primary }}>{showAlts ? 'Ausblenden' : 'Alternativen ▾'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {result.hatirlatma && (
        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 11 }}>💡</Text>
          <Text style={{ fontSize: 12, color: C.primaryDark }}>{result.hatirlatma}</Text>
        </View>
      )}

      {showAlts && result.alternatives.map((alt, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => { onAlt(alt.typ); setShowAlts(false); }}
          style={{
            marginTop: 6, flexDirection: 'row', justifyContent: 'space-between',
            backgroundColor: C.bgCard, borderRadius: R.md, padding: 10,
            borderWidth: 1, borderColor: C.border,
          }}
        >
          <Text style={{ fontSize: 13, color: C.text }}>
            {alt.typ}{alt.subtyp ? ` · ${alt.subtyp}` : ''}
          </Text>
          <Text style={{ fontSize: 12, color: C.textTertiary }}>{alt.score}% →</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
