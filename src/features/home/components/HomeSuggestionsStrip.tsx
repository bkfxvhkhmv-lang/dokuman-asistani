import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../ThemeContext';
import type { HomeSuggestion } from '../../../services/SmartSuggestionsService';

interface HomeSuggestionsStripProps {
  suggestions: HomeSuggestion[];
  onPress: (aktion: string, dokId?: string) => void;
}

export default function HomeSuggestionsStrip({ suggestions, onPress }: HomeSuggestionsStripProps) {
  const { Colors: C, R, RiskColors } = useTheme();

  const priorityStyle = (priority: string) => {
    if (priority === 'kritisch') return { border: RiskColors.hoch.color,   bg: RiskColors.hoch.bg   };
    if (priority === 'hoch')     return { border: RiskColors.mittel.color,  bg: RiskColors.mittel.bg };
    if (priority === 'mittel')   return { border: C.primary,               bg: C.primaryLight        };
    return                              { border: C.border,                 bg: C.bgCard              };
  };

  return (
    <View style={{ marginBottom: 4 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
      >
        {suggestions.slice(0, 5).map((s, i) => {
          const p = priorityStyle(s.priority);
          const isText = s.icon === '€';
          return (
            <TouchableOpacity
              key={i}
              onPress={() => onPress(s.aktion, s.dokId)}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                paddingHorizontal: 14, paddingVertical: 11,
                borderRadius: R.lg, backgroundColor: p.bg,
                borderWidth: 1.5, borderColor: p.border,
                maxWidth: 230, minHeight: 54,
              }}
            >
              <View style={{
                width: 30, height: 30, borderRadius: R.md,
                backgroundColor: `${p.border}20`,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: isText ? 15 : 14, fontWeight: '800', color: p.border }}>
                  {s.icon}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, letterSpacing: -0.1 }} numberOfLines={1}>
                  {s.titel}
                </Text>
                <Text style={{ fontSize: 10, color: C.textSecondary, marginTop: 1 }} numberOfLines={1}>
                  {s.beschreibung}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
