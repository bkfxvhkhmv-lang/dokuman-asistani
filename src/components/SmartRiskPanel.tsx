import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import type { RiskEngineResult, RiskLevel, RiskTrend } from '@/services/SmartRiskEngineService';
import { useT } from '@/hooks/useT';

interface SmartRiskPanelProps {
  result: RiskEngineResult;
  onAktion?: (key: string) => void;
  compact?: boolean;
}

const TREND_ICON: Record<RiskTrend, string> = {
  verschlechtert: 'arrow-up', stabil: 'minus', verbessert: 'arrow-down',
};

function ScoreGauge({ score, color, bg, textColor }: { score: number; color: string; bg: string; textColor: string }) {
  const { t: T } = useT();
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 64, height: 64, borderRadius: 32,
        borderWidth: 5, borderColor: color,
        backgroundColor: bg,
        alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color }}>{score}</Text>
      </View>
      <Text style={{ fontSize: 9, fontWeight: '700', color: textColor, marginTop: 4, textAlign: 'center' }}>
        {T('risk.title')}
      </Text>
    </View>
  );
}

export default function SmartRiskPanel({ result, onAktion, compact = false }: SmartRiskPanelProps) {
  const { Colors: C, R } = useTheme();
  const { t: T } = useT();
  const [expanded, setExpanded] = useState(false);
  const { level, isDataInsufficient } = result;

  const displayLevel: typeof level = isDataInsufficient ? 'kein' : level;
  const displayLabel = isDataInsufficient ? T('risk.incomplete.title') : T(result.levelLabelKey);
  const displayErklaerung = isDataInsufficient
    ? T('risk.incomplete.body')
    : T(result.erklaerungKey, result.erklaerungParams);
  const vorschlaege = result.reduzierungsVorschlaege.filter(v => v.dringlichkeit !== 'bald');

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

  const bg = LEVEL_BG[displayLevel];
  const border = LEVEL_BORDER[displayLevel];
  const textColor = LEVEL_TEXT[displayLevel];

  const scoreForLevel = (l: string) => {
    const lev = l as RiskLevel;
    return { color: LEVEL_BORDER[lev] ?? C.border, bg: LEVEL_BG[lev] ?? C.bgCard, textColor: LEVEL_TEXT[lev] ?? C.text };
  };
  const { color: gaugeColor, bg: gaugeBg, textColor: gaugeText } = scoreForLevel(displayLevel);

  const factorColor = (score: number) =>
    score >= 70 ? C.danger : score >= 40 ? C.warning : C.success;

  if (compact) {
    return (
      <View style={{ backgroundColor: bg, borderRadius: R.lg, borderWidth: 1, borderColor: border + '77' }}>
        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
          <ScoreGauge score={result.gesamtScore} color={gaugeColor} bg={gaugeBg} textColor={gaugeText} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: textColor }}>{displayLabel}</Text>
            <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }} numberOfLines={2}>
              {displayErklaerung}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
              <Icon name={TREND_ICON[result.trend]} size={11} color={TREND_COLOR[result.trend]} />
              <Text style={{ fontSize: 10, color: TREND_COLOR[result.trend], fontWeight: '700' }}>{T(result.trendLabelKey)}</Text>
            </View>
          </View>
        </View>

        {/* "Warum?" toggle */}
        <TouchableOpacity
          onPress={() => setExpanded(v => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
            paddingVertical: 8, borderTopWidth: 0.5, borderColor: border + '44' }}
        >
          <Text style={{ fontSize: 11, color: textColor, fontWeight: '600' }}>
            {expanded ? T('common.less') : T('common.why')}
          </Text>
          <Icon name={expanded ? 'caret-up' : 'caret-down'} size={11} color={textColor} />
        </TouchableOpacity>

        {/* Top factors — visible after toggle */}
        {expanded && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
            {result.faktoren.slice(0, 4).map((f, i) => (
              <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingVertical: 6, borderTopWidth: i === 0 ? 0 : 0.5, borderColor: border + '33' }}>
                <Text style={{ fontSize: 14, width: 22, textAlign: 'center' }}>{f.icon}</Text>
                <Text style={{ fontSize: 12, color: C.text, flex: 1 }}>{T(f.beschreibungKey, f.beschreibungParams)}</Text>
                <View style={{ width: 36, height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ height: 3, borderRadius: 2, width: `${f.score}%`, backgroundColor: factorColor(f.score) }} />
                </View>
              </View>
            ))}
          </View>
        )}
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
              {displayLabel}
            </Text>
            {!isDataInsufficient && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Icon name={TREND_ICON[result.trend]} size={11} color={TREND_COLOR[result.trend]} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: TREND_COLOR[result.trend] }}>{T(result.trendLabelKey)}</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 4, lineHeight: 16 }}>
            {displayErklaerung}
          </Text>
        </View>
      </View>

      {/* Reduction suggestions — 'bald' items hidden */}
      {vorschlaege.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: textColor, marginBottom: 6 }}>
            {T('risk.reduce')}
          </Text>
          {vorschlaege.map((v, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => onAktion?.(v.aktion)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6,
                borderTopWidth: i > 0 ? 0.5 : 0, borderColor: border + '33' }}>
              <Icon name={v.icon} size={16} color={textColor} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>{T(v.beschreibungKey, v.beschreibungParams)}</Text>
                <Text style={{ fontSize: 10, color: C.textTertiary }}>{T(v.wirkungKey, v.wirkungParams)}</Text>
              </View>
              <View style={{ backgroundColor: v.dringlichkeit === 'sofort' ? border : C.bgInput,
                borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 }}>
                <Text style={{ fontSize: 9, fontWeight: '800',
                  color: v.dringlichkeit === 'sofort' ? '#fff' : C.textTertiary }}>
                  {v.dringlichkeit === 'sofort'
                    ? T('risk.urgency.now')
                    : v.dringlichkeit === 'diese_woche'
                      ? T('risk.urgency.this_week')
                      : T('risk.urgency.soon')}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 11, color: textColor }}>
            {expanded ? T('risk.less_details') : T('risk.all_factors')}
          </Text>
          <Icon name={expanded ? 'caret-up' : 'caret-down'} size={11} color={textColor} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 10 }}>
          {/* Risk factors */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: textColor, marginBottom: 6 }}>{T('risk.factors')}</Text>
          {result.faktoren.map(f => (
            <View key={f.id} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={{ fontSize: 13, width: 18, textAlign: 'center' }}>{f.icon}</Text>
                  <Text style={{ fontSize: 11, color: C.text }}>{T(f.beschreibungKey, f.beschreibungParams)}</Text>
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
              <Text style={{ fontSize: 11, fontWeight: '700', color: textColor, marginBottom: 6 }}>{T('risk.legal')}</Text>
              {result.darkPatterns.map(dp => (
                <View key={dp.id} style={{ backgroundColor: C.bgCard, borderRadius: R.md, padding: 10,
                  marginBottom: 6, borderWidth: 1, borderColor: LEVEL_BORDER[dp.schwere as RiskLevel] + '44' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>{dp.titel}</Text>
                  <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{dp.beschreibung}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Icon name="gavel" size={12} color={C.primary} />
                    <Text style={{ fontSize: 10, color: C.primary, flex: 1 }}>{dp.rechtsgrundlage}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Peer comparison */}
          {result.peerComparison && (
            <View style={{ marginTop: 8, backgroundColor: C.bgCard, borderRadius: R.md, padding: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.textTertiary, marginBottom: 4 }}>
                {T('risk.peer_compare')}
              </Text>
              <Text style={{ fontSize: 12, color: C.text }}>{T(result.peerComparison.beschreibungKey, result.peerComparison.beschreibungParams)}</Text>
              <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
                {T('risk.peer_stats', {
                  n: result.peerComparison.aehnlicheDokumente,
                  risk: result.peerComparison.durchschnittRisiko,
                })}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
