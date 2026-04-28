import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../ThemeContext';
import { formatBetrag, formatFrist, formatDatum } from '../../../utils';
import type { Dokument } from '../../../store';
import type { RiskEntry } from '../../../utils/types';
import type { DocIntent } from '../hooks/useDocumentAI';
import type { OutcomePrediction } from '../../../core/intelligence/OutcomePredictor';

const TYP_EMOJI: Record<string, string> = {
  Mahnung: '⚠️', Rechnung: '💶', Bußgeld: '🚔',
  Behörde: '🏛️', Termin: '📅', Vertrag: '📝',
  Versicherung: '🛡️', Sonstiges: '📄',
};

interface HeroCardProps {
  dok: Dokument;
  info: RiskEntry & { emoji?: string };
  score: number;
  scoreColor: string;
  docIntent?: DocIntent | null;
  outcomePrediction?: OutcomePrediction | null;
  kontaktName?: string | null;
  onKontaktVerknuepfen: () => void;
  onSimulator?: () => void;
  anonModus?: boolean;
  parallaxTranslate?: Animated.AnimatedInterpolation<number>;
}

export default function HeroCard({
  dok, info, score, scoreColor, docIntent, outcomePrediction,
  kontaktName, onKontaktVerknuepfen, onSimulator, anonModus,
  parallaxTranslate,
}: HeroCardProps) {
  const { Colors: C, S, Shadow } = useTheme();

  const workflowPalette: Record<string, { bg: string; text: string }> = {
    green: { bg: C.successLight, text: C.successText },
    blue:  { bg: C.primaryLight, text: C.primaryDark },
    amber: { bg: C.warningLight, text: C.warningText },
  };
  const workflowTone = workflowPalette[dok.workflowColor ?? ''] || workflowPalette.blue;
  const topOutcomeText = outcomePrediction?.topOutcome
    ? `%${Math.round(outcomePrediction.topOutcome.probability * 100)} ${outcomePrediction.topOutcome.outcome}`
    : null;

  return (
    <View style={{ marginHorizontal: S.md, marginTop: S.sm, marginBottom: S.md, borderRadius: 20, overflow: 'hidden', ...Shadow.sm }}>
      <Animated.View style={{
        backgroundColor: info.color, padding: S.lg, paddingBottom: S.md,
        transform: parallaxTranslate ? [{ translateY: parallaxTranslate }] : [],
      }}>
        {/* Shine overlay — Apple Pay card plastiklik efekti */}
        <LinearGradient
          colors={['rgba(255,255,255,0.18)', 'transparent', 'rgba(0,0,0,0.06)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 26 }}>{TYP_EMOJI[dok.typ] || '📄'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5, marginBottom: 3 }}>
              {dok.typ?.toUpperCase()} · {dok.absender}
            </Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff', lineHeight: 23 }} numberOfLines={2}>{dok.titel}</Text>
          </View>
        </View>
      </Animated.View>

      <View style={{ backgroundColor: C.bgCard, paddingHorizontal: S.md, paddingVertical: S.sm }}>
        {([
          { emoji: info.emoji ?? '🎯', label: 'Risk',          value: info.label,         color: info.color,           show: true },
          { emoji: docIntent?.emoji ?? '🎯',    label: 'Dokumentzweck', value: docIntent?.label,    color: docIntent?.color,     show: !!docIntent },
          { emoji: '⏳',                         label: 'Frist',         value: dok.frist ? formatFrist(dok.frist) : null, color: info.color, show: !!dok.frist },
          { emoji: '💶',                         label: 'Betrag',        value: dok.betrag ? formatBetrag(dok.betrag) : null, color: C.primaryDark, show: !!dok.betrag },
          { emoji: '🔮',                         label: 'Vorausschau',   value: topOutcomeText,      color: C.primaryMid,          show: !!topOutcomeText },
        ] as const).filter(r => r.show && r.value).map((row, i, arr) => (
          <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7,
            borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: C.borderLight }}>
            <Text style={{ fontSize: 14, width: 22, textAlign: 'center' }}>{row.emoji}</Text>
            <Text style={{ fontSize: 11, color: C.textTertiary, width: 54 }}>{row.label}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: row.color ?? C.text, flex: 1 }}>{row.value}</Text>
          </View>
        ))}
        <TouchableOpacity onPress={onSimulator}
          style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: C.primaryLight }}>
          <Text style={{ fontSize: 13 }}>🔮</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary }}>„Was passiert dann?" — Szenario simulieren</Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: C.bgCard, paddingHorizontal: S.lg, paddingBottom: S.md, borderTopWidth: 0.5, borderTopColor: C.borderLight }}>
        {outcomePrediction?.topOutcome && (
          <View style={{ marginTop: S.sm, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: C.primaryMid + '88' }}>
            <Text style={{ fontSize: 13 }}>🔮</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary }}>Voraussichtliches Ergebnis: {topOutcomeText}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: S.sm }}>
          <Text style={{ fontSize: 12, color: C.textSecondary, flex: 1 }}>{dok.absender} · {formatDatum(dok.datum)}</Text>
          <TouchableOpacity onPress={onKontaktVerknuepfen}
            style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
              backgroundColor: kontaktName ? C.successLight : C.bgInput, borderWidth: 0.5, borderColor: C.border }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: kontaktName ? C.success : C.textTertiary }}>
              {kontaktName ? `👤 ${kontaktName}` : '+ Kontakt'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, height: 6, backgroundColor: C.borderLight, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: 6, width: `${score}%`, backgroundColor: scoreColor, borderRadius: 3 }} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: scoreColor, width: 52 }}>
            {score < 45 ? '⚠️' : score < 75 ? '🔶' : '✅'} {score}%
          </Text>
        </View>
        <Text style={{ fontSize: 10, color: C.textTertiary, marginTop: 2 }}>
          Lesequalität & Vollständigkeit{score < 45 ? ' — Einige Felder fehlen möglicherweise' : ''}
        </Text>
        {dok.erledigt && (
          <View style={{ marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: C.successLight }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.successText }}>✓ Erledigt</Text>
          </View>
        )}
        {!!dok.workflowStamp && (
          <View style={{ marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: workflowTone.bg }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: workflowTone.text }}>{dok.workflowStamp}</Text>
          </View>
        )}
        {!!dok.workflowTimeline && (
          <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 8 }}>{dok.workflowTimeline}</Text>
        )}
      </View>
    </View>
  );
}
