import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { HIT_SLOP_LG } from '@/theme';
import type { Dokument } from '@/store';
import type { OzetQuelle } from '@/utils/types';
import { getReviewLabel } from '@/utils/documentGuards';
import { getDetailTypeLabel } from '@/constants/docTypeConfig';

interface AIBoxProps {
  dok: Dokument | undefined;
  onMailTaslak: () => void;
  ozetQuellenSichtbar: boolean;
  setOzetQuellenSichtbar: (fn: (v: boolean) => boolean) => void;
  ozetQuellen?: OzetQuelle[];
}

export default function AIBox({ dok, onMailTaslak, ozetQuellenSichtbar, setOzetQuellenSichtbar, ozetQuellen = [] }: AIBoxProps) {
  const { Colors: C, S, R, Shadow } = useTheme();
  const { t: T } = useT();
  const scale   = useSharedValue(0.94);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!dok) return;
    opacity.value = withTiming(1, { duration: 220 });
    scale.value   = withSpring(1, { damping: 16, stiffness: 180, mass: 0.4 });
  }, [dok?.id]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!dok) return null;
  const reviewLabel = getReviewLabel(dok);
  const typeLabel = getDetailTypeLabel(dok.typ, dok.rohText, dok.titel);

  return (
    <Animated.View style={[
      animStyle, aiBoxSt.wrapper,
      { marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg, borderWidth: 0.5, borderColor: C.borderLight, ...Shadow.sm },
      Platform.OS === 'android' && { elevation: 3, borderWidth: 1, borderColor: C.border },
    ]}>
      {/* Surface background */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={64} tint="light" style={[StyleSheet.absoluteFill, { borderRadius: R.lg }]} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { borderRadius: R.lg, backgroundColor: C.bgCard }]} />
      )}
      <View style={{ padding: S.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.primary }}>KI</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{T('detail.section.summary')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {dok.confidence != null && (reviewLabel || dok.confidence >= 80) && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
              backgroundColor: dok.confidence >= 80 ? C.successLight : dok.confidence >= 55 ? C.warningLight : C.dangerLight }}>
              <Text style={{ fontSize: 11, fontWeight: '700',
                color: dok.confidence >= 80 ? C.success : dok.confidence >= 55 ? C.warning : C.danger }}>
                {dok.confidence >= 80 ? T('detail.trust.ai_checked') : reviewLabel ?? T('detail.trust.auto')}
              </Text>
            </View>
          )}
          <TouchableOpacity onPress={onMailTaslak}
            hitSlop={HIT_SLOP_LG}
            style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: C.bgInput, borderWidth: 0.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="envelope-simple" size={12} color={C.textSecondary} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: C.textSecondary }}>{T('common.email')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 22 }}>
        {dok.zusammenfassung?.replace(/\bRechnungen\b/g, typeLabel)}
      </Text>

      {dok.rohText && dok.zusammenfassung && (
        <TouchableOpacity onPress={() => setOzetQuellenSichtbar(v => !v)}
          hitSlop={HIT_SLOP_LG}
          style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
            backgroundColor: ozetQuellenSichtbar ? C.primaryLight : C.bgInput,
            borderWidth: 0.5, borderColor: ozetQuellenSichtbar ? C.primary : C.border }}>
          <Icon name="search" size={16} color={ozetQuellenSichtbar ? C.primaryDark : C.textSecondary} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: ozetQuellenSichtbar ? C.primaryDark : C.textSecondary }}>
            {ozetQuellenSichtbar ? T('detail.hide_sources') : T('detail.show_sources')}
          </Text>
        </TouchableOpacity>
      )}

      {ozetQuellenSichtbar && ozetQuellen.length > 0 && (
        <View style={{ marginTop: 10, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.5, marginBottom: 8 }}>{T('detail.section.original_text')}</Text>
          {ozetQuellen.map((q, i) => (
            <View key={i} style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden' }}>
              <View style={{ padding: 8, backgroundColor: C.primaryLight, borderRadius: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.primaryDark, marginBottom: 4 }}>"{q.ozetSatz}"</Text>
                <Text style={{ fontSize: 10, color: C.textTertiary, fontStyle: 'italic', lineHeight: 15 }}>
                  {T('common.source')}: {q.quelle}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
      {ozetQuellenSichtbar && ozetQuellen.length === 0 && (
        <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 8, fontStyle: 'italic' }}>Keine eindeutigen Quellsätze gefunden.</Text>
      )}
      </View>
    </Animated.View>
  );
}

const aiBoxSt = StyleSheet.create({
  wrapper: { overflow: 'hidden' },
});
