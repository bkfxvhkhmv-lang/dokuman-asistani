import React from 'react';
import { View, Text } from 'react-native';
import Icon from '../../../components/Icon';
import { useTheme } from '../../../ThemeContext';
import AIThinkingIndicator from '../../../components/AIThinkingIndicator';
import type { DocumentDigitalTwinModel } from '../../../core/intelligence/DocumentDigitalTwin';

interface DigitalTwinPanelProps {
  digitalTwin: DocumentDigitalTwinModel | null | undefined;
  institutionDesc?: string | null;
  isLoading?: boolean;  // true while twin is being computed
}

export default function DigitalTwinPanel({ digitalTwin, institutionDesc, isLoading }: DigitalTwinPanelProps) {
  const { Colors: C, S, R, Shadow } = useTheme();

  // Show AI thinking indicator while computing
  if (!digitalTwin) {
    if (!isLoading) return null;
    return (
      <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg,
        backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
        <AIThinkingIndicator label="Digital Twin wird erstellt…" />
      </View>
    );
  }

  return (
    <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg,
      backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, overflow: 'hidden', ...Shadow.sm }}>
      <View style={{ paddingHorizontal: S.md, paddingVertical: 10, backgroundColor: C.primaryLight,
        flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 16 }}>{digitalTwin?.intelligence?.lifecycle?.phaseIcon || '🧠'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.primaryDark }}>
            {digitalTwin?.intelligence?.lifecycle?.phaseLabel || 'Digital Twin'}
          </Text>
          <Text style={{ fontSize: 10, color: C.primary }} numberOfLines={1}>
            {digitalTwin?.statusSummary || 'Status verfügbar'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 10, color: C.textTertiary }}>Status</Text>
          <Text style={{ fontSize: 14, fontWeight: '700',
            color: digitalTwin?.healthScore >= 75 ? C.success : digitalTwin?.healthScore >= 45 ? C.warning : C.danger }}>
            {digitalTwin?.healthScore ?? 0}%
          </Text>
        </View>
      </View>
      <View style={{ padding: S.md, gap: 6 }}>
        {digitalTwin?.intelligence?.lifecycle?.nextAction && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 14 }}>{digitalTwin?.intelligence?.lifecycle?.nextActionEmoji || '👉'}</Text>
            <Text style={{ fontSize: 12, color: C.text, flex: 1 }}>{digitalTwin?.intelligence?.lifecycle?.nextAction}</Text>
            <Text style={{ fontSize: 10, color: C.textTertiary }}>
              {digitalTwin?.intelligence?.lifecycle?.confidence === 'high' ? 'Sicher'
                : digitalTwin?.intelligence?.lifecycle?.confidence === 'medium' ? 'Mittel' : 'Prüfen'}
            </Text>
          </View>
        )}
        {institutionDesc && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
            <Text style={{ fontSize: 14 }}>🏛️</Text>
            <Text style={{ fontSize: 11, color: C.textSecondary, flex: 1 }}>{institutionDesc}</Text>
          </View>
        )}
        {digitalTwin?.syncState?.hasConflict && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: C.warningLight, borderRadius: 8, padding: 6 }}>
            <Icon name="alert-circle" size={16} color={C.warningText} />
            <Text style={{ fontSize: 11, color: C.warningText }}>Synchronisierungskonflikt erkannt</Text>
          </View>
        )}
      </View>
    </View>
  );
}
