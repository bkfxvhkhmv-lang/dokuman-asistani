import React, { useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../../../ThemeContext';
import { formatBetrag, formatFrist, findeOzetQuellen } from '../../../utils';
import HeroCard from './HeroCard';
import type { Dokument, ActionHistoryEntry } from '../../../store';
import type { RiskEntry, OzetKarte } from '../../../utils/types';
import type { DocIntent } from '../hooks/useDocumentAI';
import type { OutcomePrediction } from '../../../core/intelligence/OutcomePredictor';
import type { DocumentChain } from '../services/documentChainEngine';
import type { SendProfile } from '../services/documentActionFlows';

interface OzetTabProps {
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
  ozetKartlari?: OzetKarte[];
  onOzetAktion?: (aktion: string) => void;
  onMailTaslak: () => void;
  ozetQuellenSichtbar: boolean;
  setOzetQuellenSichtbar: (fn: (v: boolean) => boolean) => void;
  institutionSendProfile?: SendProfile | null;
  documentChain?: DocumentChain | null;
}

export default function OzetTab({
  dok, info, score, scoreColor, docIntent, outcomePrediction,
  kontaktName, onKontaktVerknuepfen, onSimulator, anonModus,
  ozetKartlari = [], onOzetAktion, onMailTaslak,
  ozetQuellenSichtbar, setOzetQuellenSichtbar,
  institutionSendProfile, documentChain,
}: OzetTabProps) {
  const { Colors: C, S, R, Shadow } = useTheme();

  const scrollY = useRef(new Animated.Value(0)).current;
  const parallaxTranslate = scrollY.interpolate({
    inputRange: [0, 220],
    outputRange: [0, -55],
    extrapolate: 'clamp',
  });

  const ozetQuellen = ozetQuellenSichtbar
    ? findeOzetQuellen(dok.rohText, dok.zusammenfassung)
    : [];
  const history = dok.actionHistory || [];
  const channelLabel = institutionSendProfile?.preferredChannel === 'email' ? 'E-Mail'
    : institutionSendProfile?.preferredChannel === 'web'  ? 'Webformular'
    : institutionSendProfile?.preferredChannel === 'post' ? 'Post' : 'Unbekannt';

  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 132 }}
      scrollEventThrottle={16}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true },
      )}
    >
      <HeroCard
        dok={dok} info={info} score={score} scoreColor={scoreColor}
        docIntent={docIntent} outcomePrediction={outcomePrediction}
        kontaktName={kontaktName} onKontaktVerknuepfen={onKontaktVerknuepfen}
        onSimulator={onSimulator} anonModus={anonModus}
        parallaxTranslate={parallaxTranslate}
      />

      {/* Özet Kartları */}
      {ozetKartlari.length > 0 && (
        <View style={{ marginHorizontal: S.md, marginBottom: S.md }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8, marginBottom: 8 }}>KURZÜBERSICHT</Text>
          {ozetKartlari.map((karte, i) => (
            <View key={i} style={{ borderRadius: R.md, padding: S.md, marginBottom: 8,
              backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>{karte.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{karte.titel}</Text>
                  <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{karte.inhalt}</Text>
                </View>
                {karte.aktion && karte.aktionLabel && (
                  <TouchableOpacity onPress={() => onOzetAktion?.(karte.aktion!)}
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: C.primary }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{karte.aktionLabel}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Kanal-Empfehlung */}
      {institutionSendProfile && (
        <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg, padding: S.md,
          backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: `${C.primary}33` }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: C.primaryDark, letterSpacing: 0.8, marginBottom: 4 }}>EMPFOHLENER KOMMUNIKATIONSKANAL</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: C.primaryDark }}>{channelLabel}</Text>
          {institutionSendProfile.requiresAttachment && (
            <Text style={{ fontSize: 11, color: C.primary, marginTop: 4 }}>📎 Anhang erforderlich</Text>
          )}
        </View>
      )}

      {/* Aktionsverlauf */}
      {history.length > 0 && (
        <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg, padding: S.md,
          backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8, marginBottom: 10 }}>AKTIONSVERLAUF</Text>
          {(history as ActionHistoryEntry[]).map((entry, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
              borderBottomWidth: i < history.length - 1 ? 0.5 : 0, borderBottomColor: C.border }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>{entry.label}</Text>
                <Text style={{ fontSize: 10, color: C.textTertiary }}>{entry.timeline}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Warnung */}
      {dok.warnung && (
        <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg, padding: S.md,
          backgroundColor: C.warningLight, borderWidth: 0.5, borderColor: C.warning }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.warningText ?? C.warning, marginBottom: 4 }}>⚠ Hinweis</Text>
          <Text style={{ fontSize: 12, color: C.warningText ?? C.warning, lineHeight: 18 }}>{dok.warnung}</Text>
        </View>
      )}

      {/* Zusammenfassung mit Quellensuche */}
      {dok.zusammenfassung && (
        <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg, padding: S.md,
          backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8 }}>KI-ZUSAMMENFASSUNG</Text>
            <TouchableOpacity onPress={() => onMailTaslak()}
              style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: C.bgInput, borderWidth: 0.5, borderColor: C.border }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: C.textSecondary }}>📧 E-Mail</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 20 }}>{dok.zusammenfassung}</Text>
          {dok.rohText && (
            <TouchableOpacity onPress={() => setOzetQuellenSichtbar(v => !v)}
              style={{ marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                backgroundColor: ozetQuellenSichtbar ? C.primaryLight : C.bgInput,
                borderWidth: 0.5, borderColor: ozetQuellenSichtbar ? C.primary : C.border }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: ozetQuellenSichtbar ? C.primaryDark : C.textSecondary }}>
                {ozetQuellenSichtbar ? 'Quellen ausblenden' : 'Quellen anzeigen'}
              </Text>
            </TouchableOpacity>
          )}
          {ozetQuellenSichtbar && ozetQuellen.map((q, i) => (
            <View key={i} style={{ marginTop: 8, padding: 8, backgroundColor: C.primaryLight, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.primaryDark, marginBottom: 4 }}>"{q.ozetSatz}"</Text>
              <Text style={{ fontSize: 10, color: C.textTertiary, fontStyle: 'italic' }}>
                Quelle: {q.quelle} ({q.konfidenz}%)
              </Text>
            </View>
          ))}
        </View>
      )}
    </Animated.ScrollView>
  );
}
