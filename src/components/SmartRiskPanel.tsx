import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../ThemeContext';
import type { RiskEngineResult, RiskLevel, RiskTrend } from '../services/SmartRiskEngineService';

interface SmartRiskPanelProps {
  result: RiskEngineResult;
  onAktion?: (key: string) => void;
  compact?: boolean;
}

const TREND_ICON: Record<RiskTrend, string> = {
  verschlechtert: '↑', stabil: '→', verbessert: '↓',
};

function ScoreGauge({ score, color, bg, textColor }: { score: number; color: string; bg: string; textColor: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 64, height: 64, borderRadius: 32,
        borderWidth: 5, borderColor: color,
        backgroundColor: bg,
        alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color }}>{score}</Text>
      </View>
      <Text style={{ fontSize: 9, fontWeight: '700', color: textColor, marginTop: 4, textAlign: 'center' }}>
        RISIKO
      </Text>
    </View>
  );
}

export default function SmartRiskPanel({ result, onAktion, compact = false }: SmartRiskPanelProps) {
  const { Colors: C, R } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const { level } = result;

  const LEVEL_BG: Record<RiskLevel, string> = {
    kritisch: C.dangerLight, hoch: C.warningLight, mittel: C.warningLight, niedrig: C.successLight, kein: C.primaryLight,
  };
  const LEVEL_BORDER: Record<RiskLevel, string> = {
    kritisch: C.danger, hoch: C.warning, mittel: C.warningBorder, niedrig: C.success, kein: C.primary,
  };
  const LEVEL_TEXT: Record<RiskLevel, string> = {
    kritisch: C.dangerText, hoch: C.warningText, mittel: C.warningText, niedrig: C.successText, kein: C.primaryDark,
  };
  const TREND_COLOR: Record<RiskTrend, string> = {
    verschlechtert: C.danger, stabil: C.warning, verbessert: C.success,
  };

  const bg = LEVEL_BG[level];
  const border = LEVEL_BORDER[level];
  const textColor = LEVEL_TEXT[level];

  const scoreForLevel = (l: string) => {
    const lev = l as RiskLevel;
    return { color: LEVEL_BORDER[lev] ?? C.border, bg: LEVEL_BG[lev] ?? C.bgCard, textColor: LEVEL_TEXT[lev] ?? C.text };
  };
  const { color: gaugeColor, bg: gaugeBg, textColor: gaugeText } = scoreForLevel(level);

  const factorColor = (score: number) =>
    score >= 70 ? C.danger : score >= 40 ? C.warning : C.success;

  if (compact) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: bg, borderRadius: R.lg, padding: 12,
        borderWidth: 1, borderColor: border + '77' }}>
        <ScoreGauge score={result.gesamtScore} color={gaugeColor} bg={gaugeBg} textColor={gaugeText} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: textColor }}>{result.levelLabel}</Text>
          <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }} numberOfLines={2}>
            {result.erklaerung}
          </Text>
          <Text style={{ fontSize: 10, color: TREND_COLOR[result.trend], marginTop: 4, fontWeight: '700' }}>
            {TREND_ICON[result.trend]} {result.trendLabel}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: bg, borderRadius: R.lg, padding: 14,
      borderWidth: 1, borderColor: border + '66', marginBottom: 12 }}>

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <ScoreGauge score={result.gesamtScore} color={gaugeColor} bg={gaugeBg} textColor={gaugeText} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: textColor, flex: 1 }}>
              {result.levelLabel}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: TREND_COLOR[result.trend] }}>
              {TREND_ICON[result.trend]} {result.trendLabel}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 4, lineHeight: 16 }}>
            {result.erklaerung}
          </Text>
        </View>
      </View>

      {/* Reduction suggestions */}
      {result.reduzierungsVorschlaege.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: textColor, marginBottom: 6 }}>
            RISIKO SENKEN
          </Text>
          {result.reduzierungsVorschlaege.map((v, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => onAktion?.(v.aktion)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6,
                borderTopWidth: i > 0 ? 0.5 : 0, borderColor: border + '33' }}>
              <Text style={{ fontSize: 14 }}>{v.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>{v.beschreibung}</Text>
                <Text style={{ fontSize: 10, color: C.textTertiary }}>{v.wirkung}</Text>
              </View>
              <View style={{ backgroundColor: v.dringlichkeit === 'sofort' ? border : C.bgInput,
                borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 }}>
                <Text style={{ fontSize: 9, fontWeight: '800',
                  color: v.dringlichkeit === 'sofort' ? '#fff' : C.textTertiary }}>
                  {v.dringlichkeit === 'sofort' ? 'SOFORT' : v.dringlichkeit === 'diese_woche' ? 'DIESE WOCHE' : 'BALD'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Expand for details */}
      <TouchableOpacity
        onPress={() => setExpanded(v => !v)}
        style={{ alignItems: 'center', paddingTop: 6, borderTopWidth: 0.5, borderColor: border + '44' }}>
        <Text style={{ fontSize: 11, color: textColor }}>{expanded ? 'Weniger Details' : 'Alle Risikofaktoren'} {expanded ? '▴' : '▾'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 10 }}>
          {/* Risk factors */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: textColor, marginBottom: 6 }}>RISIKOFAKTOREN</Text>
          {result.faktoren.map(f => (
            <View key={f.id} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={{ fontSize: 11 }}>{f.icon}</Text>
                  <Text style={{ fontSize: 11, color: C.text }}>{f.beschreibung}</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: factorColor(f.score) }}>
                  {f.score}
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ height: 4, borderRadius: 2, width: `${f.score}%`,
                  backgroundColor: factorColor(f.score) }} />
              </View>
            </View>
          ))}

          {/* Dark patterns */}
          {result.darkPatterns.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: textColor, marginBottom: 6 }}>RECHTLICHE AUFFÄLLIGKEITEN</Text>
              {result.darkPatterns.map(dp => (
                <View key={dp.id} style={{ backgroundColor: C.bgCard, borderRadius: R.md, padding: 10,
                  marginBottom: 6, borderWidth: 1, borderColor: LEVEL_BORDER[dp.schwere as RiskLevel] + '44' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>{dp.titel}</Text>
                  <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{dp.beschreibung}</Text>
                  <Text style={{ fontSize: 10, color: C.primary, marginTop: 4 }}>⚖️ {dp.rechtsgrundlage}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Peer comparison */}
          {result.peerComparison && (
            <View style={{ marginTop: 8, backgroundColor: C.bgCard, borderRadius: R.md, padding: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.textTertiary, marginBottom: 4 }}>
                VERGLEICH MIT ÄHNLICHEN DOKUMENTEN
              </Text>
              <Text style={{ fontSize: 12, color: C.text }}>{result.peerComparison.beschreibung}</Text>
              <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
                {result.peerComparison.aehnlicheDokumente} ähnliche Dokumente · Ø Risiko: {result.peerComparison.durchschnittRisiko}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
