import React from 'react';
import { View, Text } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import AIThinkingIndicator from '@/components/AIThinkingIndicator';
import type { Dokument } from '@/store';
import type { DocumentDigitalTwinModel } from '@/core/intelligence/DocumentDigitalTwin';
import { formatFrist, getTageText, getTageVerbleibend } from '@/utils/formatters';

interface DigitalTwinPanelProps {
  digitalTwin: DocumentDigitalTwinModel | null | undefined;
  /** Für Frist-Zeile (relativ: „3 Tage überfällig“) */
  dok?: Dokument | null;
  institutionDesc?: string | null;
  isLoading?: boolean;
}

export default function DigitalTwinPanel({ digitalTwin, dok, institutionDesc, isLoading }: DigitalTwinPanelProps) {
  const { Colors: C, S, R, Shadow } = useTheme();

  if (!digitalTwin) {
    if (!isLoading) return null;
    return (
      <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg,
        backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
        <AIThinkingIndicator label="Kurzfassung wird ermittelt…" />
      </View>
    );
  }

  const phase = digitalTwin.intelligence?.lifecycle?.phaseLabel;
  const naechster = digitalTwin.intelligence?.lifecycle?.nextAction;
  const icon = digitalTwin.intelligence?.lifecycle?.phaseIcon || '📋';

  const tageRest = dok?.frist ? getTageVerbleibend(dok.frist) : null;
  const fristUberfaellig = tageRest !== null && tageRest < 0;

  let fristBlock: React.ReactNode = null;
  if (dok?.frist) {
    const rel = getTageText(dok.frist);
    fristBlock = (
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.4 }}>FRIST</Text>
        <Text style={{
          fontSize: 13, fontWeight: '700',
          color: fristUberfaellig ? C.danger : C.text,
        }}>
          {formatFrist(dok.frist)}{rel ? ` (${rel})` : ''}
        </Text>
      </View>
    );
  }

  return (
    <View style={{
      marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg,
      backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border,
      overflow: 'hidden', ...Shadow.sm,
    }}>
      <View style={{ paddingHorizontal: S.md, paddingVertical: S.sm, backgroundColor: C.bgInput,
        flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 0.5, borderColor: C.borderLight }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.text }}>Überblick</Text>
          <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 1 }}>Situation · Handlung · Frist</Text>
        </View>
      </View>

      <View style={{ padding: S.md, gap: 14 }}>
        {phase ? (
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.4 }}>SITUATION</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{phase}</Text>
          </View>
        ) : null}

        {naechster ? (
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.4 }}>
              HANDLUNG
            </Text>
            <Text style={{ fontSize: 13, color: C.text, lineHeight: 18 }}>{naechster}</Text>
          </View>
        ) : null}

        {fristBlock}

        {!phase && !naechster && !fristBlock && (
          <Text style={{ fontSize: 12, color: C.textSecondary }}>Keine zusätzlichen Hinweise vom Modell.</Text>
        )}

        {institutionDesc ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
            <Text style={{ fontSize: 14 }}>🏛️</Text>
            <Text style={{ fontSize: 11, color: C.textSecondary, flex: 1 }}>{institutionDesc}</Text>
          </View>
        ) : null}

        {digitalTwin.syncState?.hasConflict ? (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: C.warningLight, borderRadius: 8, padding: 8,
          }}>
            <Icon name="alert-circle" size={16} color={C.warningText} />
            <Text style={{ fontSize: 11, color: C.warningText }}>Synchronisierungskonflikt erkannt</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
