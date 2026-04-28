import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme, type ThemeColors } from '../ThemeContext';
import type { RadiusTokens } from '../theme';
import type { Suggestion, SuggestionPriority } from '../services/SmartSuggestionsService';

interface SmartSuggestionsPanelProps {
  suggestions: Suggestion[];
  onPress: (s: Suggestion) => void;
  maxVisible?: number;
  compact?: boolean;
}

type PriorityPalette = Record<SuggestionPriority, { bg: string; border: string; text: string }>;

function SuggestionChip({ s, onPress, C, R, palette }: { s: Suggestion; onPress: () => void; C: ThemeColors; R: RadiusTokens; palette: PriorityPalette }) {
  const col = palette[s.priority];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12,
        borderRadius: R.lg, marginBottom: 8,
        backgroundColor: col.bg,
        borderWidth: 1, borderColor: col.border }}>
      <Text style={{ fontSize: 20 }}>{s.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: col.text }}>{s.titel}</Text>
        <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 1 }} numberOfLines={1}>
          {s.beschreibung}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        {s.badge && (
          <View style={{ backgroundColor: col.border, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>{s.badge}</Text>
          </View>
        )}
        <Text style={{ fontSize: 11, fontWeight: '600', color: col.text }}>
          {s.aktionLabel} →
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function CompactChip({ s, onPress, C, R, palette }: { s: Suggestion; onPress: () => void; C: ThemeColors; R: RadiusTokens; palette: PriorityPalette }) {
  const col = palette[s.priority];
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: col.bg, borderRadius: R.full,
        paddingHorizontal: 12, paddingVertical: 8,
        borderWidth: 1, borderColor: col.border,
        marginRight: 8 }}>
      <Text style={{ fontSize: 14 }}>{s.icon}</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: col.text }}>{s.titel}</Text>
      {s.badge && (
        <View style={{ backgroundColor: col.border, borderRadius: 999, paddingHorizontal: 5, paddingVertical: 1 }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>{s.badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function SmartSuggestionsPanel({
  suggestions,
  onPress,
  maxVisible = 5,
  compact = false,
}: SmartSuggestionsPanelProps) {
  const { Colors: C, R } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const PRIORITY_COLOR: PriorityPalette = {
    kritisch: { bg: C.dangerLight,  border: C.danger,      text: C.dangerText  },
    hoch:     { bg: C.warningLight, border: C.warning,     text: C.warningText },
    mittel:   { bg: C.successLight, border: C.success,     text: C.successText },
    niedrig:  { bg: C.primaryLight, border: C.primary,     text: C.primaryDark },
  };

  if (suggestions.length === 0) return null;

  const visible = expanded ? suggestions : suggestions.slice(0, maxVisible);

  if (compact) {
    return (
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 4 }}>
          {visible.map(s => (
            <CompactChip key={s.id} s={s} onPress={() => onPress(s)} C={C} R={R} palette={PRIORITY_COLOR} />
          ))}
          {!expanded && suggestions.length > maxVisible && (
            <TouchableOpacity
              onPress={() => setExpanded(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 12, paddingVertical: 8,
                backgroundColor: C.bgInput, borderRadius: R.full,
                borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 12, color: C.textSecondary }}>+{suggestions.length - maxVisible} mehr</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.6, flex: 1 }}>
          ⚡ EMPFEHLUNGEN
        </Text>
        {suggestions.length > maxVisible && (
          <TouchableOpacity onPress={() => setExpanded(v => !v)}>
            <Text style={{ fontSize: 12, color: C.primary }}>{expanded ? 'Weniger' : `Alle ${suggestions.length}`} →</Text>
          </TouchableOpacity>
        )}
      </View>
      {visible.map(s => (
        <SuggestionChip key={s.id} s={s} onPress={() => onPress(s)} C={C} R={R} palette={PRIORITY_COLOR} />
      ))}
    </View>
  );
}
