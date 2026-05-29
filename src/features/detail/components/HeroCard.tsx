import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/ThemeContext';
import { formatBetrag, formatFrist, formatDatum } from '@/utils';
import { HIT_SLOP_LG } from '@/theme';
import AiSparkle from '@/components/AiSparkle';
import Icon from '@/components/Icon';
import type { Dokument } from '@/store';
import type { RiskEntry } from '@/utils/types';
import type { DocIntent } from '@/features/detail/hooks/useDocumentAI';
import type { OutcomePrediction } from '@/core/intelligence/OutcomePredictor';
import { safeDisplayTitel, safeDisplayAbsender } from '@/utils/displaySanitizer';

const TYP_ICON: Record<string, string> = {
  Mahnung:     'warning-circle',
  Rechnung:    'receipt',
  Bußgeld:     'warning-octagon',
  Behörde:     'buildings',
  Termin:      'calendar-blank',
  Vertrag:     'file-text',
  Versicherung:'shield-check',
  Sonstiges:   'document-text',
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
  /** Einfacher Modus auf Detail: weniger KPI-Zeilen, keine Simulation/OCR-Bar */
  simpleLayout?: boolean;
}

export default function HeroCard({
  dok, info, score: _score, scoreColor,
  kontaktName, onKontaktVerknuepfen,
  parallaxTranslate,
  simpleLayout = false,
}: HeroCardProps) {
  const { Colors: C, S, Shadow, fs } = useTheme();

  const workflowPalette: Record<string, { bg: string; text: string }> = {
    green: { bg: C.successLight, text: C.successText },
    blue:  { bg: C.primaryLight, text: C.primaryDark },
    amber: { bg: C.warningLight, text: C.warningText },
  };
  const workflowTone = workflowPalette[dok.workflowColor ?? ''] || workflowPalette.blue;

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
            <Icon name={TYP_ICON[dok.typ] || 'document-text'} size={28} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5, marginBottom: 3 }}>
              {dok.typ?.toUpperCase()}{(() => { const s = safeDisplayAbsender(dok.absender, dok.confidence); return s ? ` · ${s}` : ''; })()}
            </Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff', lineHeight: 23 }} numberOfLines={2}>{safeDisplayTitel(dok.titel, dok.typ, dok.confidence)}</Text>
          </View>
        </View>
      </Animated.View>

      <View style={{ backgroundColor: C.bgCard, paddingHorizontal: S.md, paddingVertical: S.sm }}>
        {([
          { iconName: 'warning-circle', label: simpleLayout ? 'Wichtig' : 'Risiko', value: info.label, color: info.color, show: true, aiField: false },
          { iconName: 'clock',          label: simpleLayout ? 'Bis wann?' : 'Frist', value: dok.frist ? formatFrist(dok.frist) : null, color: info.color, show: !!dok.frist, aiField: dok.confidence != null },
          { iconName: 'currency-eur',   label: simpleLayout ? 'Betrag' : 'Betrag', value: dok.betrag ? formatBetrag(dok.betrag) : null, color: C.primaryDark, show: !!dok.betrag, aiField: dok.confidence != null },
        ] as const).filter(r => r.show && r.value).map((row, i, arr) => (
          <View key={`${row.label}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7,
            borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: C.borderLight }}>
            <View style={{ width: 22, alignItems: 'center' }}>
              <Icon name={row.iconName} size={20} color={row.color ?? C.text} />
            </View>
            <Text
              style={{ fontSize: fs(11), color: C.textTertiary, width: simpleLayout ? 92 : 54 }}
              numberOfLines={simpleLayout ? 2 : undefined}
            >
              {row.label}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: fs(12), fontWeight: '700', color: row.color ?? C.text }}>{row.value}</Text>
              {row.aiField ? <AiSparkle /> : null}
            </View>
          </View>
        ))}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingTop: 10,
            paddingBottom: 4,
            borderTopWidth: 0.5,
            borderTopColor: C.borderLight,
          }}
        >
          <Icon name="info" size={12} color={C.textTertiary} />
          <Text style={{ fontSize: 11, color: C.textTertiary, flex: 1, lineHeight: 15 }}>
            {dok.confidence == null
              ? 'Automatisch erkannt · Angaben bitte kurz prüfen'
              : dok.confidence >= 75
                ? 'Automatisch erkannt'
                : dok.confidence >= 55
                  ? 'Angaben prüfen'
                  : 'Einige Angaben prüfen'}
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: C.bgCard, paddingHorizontal: S.lg, paddingBottom: S.md, borderTopWidth: 0.5, borderTopColor: C.borderLight }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: S.sm }}>
          <Text style={{ fontSize: 12, color: C.textSecondary, flex: 1 }}>{(() => { const s = safeDisplayAbsender(dok.absender, dok.confidence); return s ? `${s} · ` : ''; })()}{formatDatum(dok.datum)}</Text>
          <TouchableOpacity onPress={onKontaktVerknuepfen}
            hitSlop={HIT_SLOP_LG}
            style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
              backgroundColor: kontaktName ? C.successLight : C.bgInput, borderWidth: 0.5, borderColor: C.border }}>
            {kontaktName ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="user" size={10} color={C.success} />
                <Text style={{ fontSize: 10, fontWeight: '600', color: C.success }}>{kontaktName}</Text>
              </View>
            ) : (
              <Text style={{ fontSize: 10, fontWeight: '600', color: C.textTertiary }}>+ Kontakt</Text>
            )}
          </TouchableOpacity>
        </View>
        {dok.erledigt && (
          <View style={{ marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: C.successLight }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="check" size={12} color={C.successText} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: C.successText }}>Erledigt</Text>
            </View>
          </View>
        )}
        {!!dok.workflowStamp && (
          <View style={{ marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: workflowTone.bg }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: workflowTone.text }}>{dok.workflowStamp}</Text>
          </View>
        )}
        {!!dok.workflowTimeline && !simpleLayout && (
          <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 8 }}>{dok.workflowTimeline}</Text>
        )}
      </View>
    </View>
  );
}
