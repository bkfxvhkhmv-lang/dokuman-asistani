import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, PanResponder, Animated as RNAnimated, Easing } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, type ThemeColors } from '../ThemeContext';
import { formatBetrag } from '../utils';
import type { Dokument } from '../store';

// ── Animated number counter (#70) ─────────────────────────────────────────

function AnimatedCounter({
  value,
  formatter = (v: number) => String(Math.round(v)),
  style,
}: {
  value:     number;
  formatter?: (v: number) => string;
  style?:    any;
}) {
  const [display, setDisplay] = useState(() => formatter(value));
  const animRef  = useRef(new RNAnimated.Value(value));
  const prevVal  = useRef(value);

  useEffect(() => {
    if (prevVal.current === value) return;
    prevVal.current = value;
    const anim = RNAnimated.timing(animRef.current, {
      toValue:         value,
      duration:        320,
      easing:          Easing.out(Easing.quad),
      useNativeDriver: false,
    });
    const id = animRef.current.addListener(({ value: v }) =>
      setDisplay(formatter(Math.round(v))),
    );
    anim.start(() => animRef.current.removeListener(id));
    return () => { anim.stop(); animRef.current.removeListener(id); };
  }, [value, formatter]);

  return <Text style={style}>{display}</Text>;
}

// ── Chart types & colours ──────────────────────────────────────────────────

const TYP_FARBEN: Record<string, string> = {
  'Rechnung':       '#6C63FF',
  'Mahnung':        '#FC5C65',
  'Bußgeld':        '#F7B731',
  'Behörde':        '#45AAF2',
  'Steuerbescheid': '#26de81',
  'Versicherung':   '#FD9644',
  'Vertrag':        '#A55EEA',
  'Sonstiges':      '#A5B1C2',
};

const TYP_IKON: Record<string, string> = {
  'Rechnung':       '',
  'Mahnung':        '⚠️',
  'Bußgeld':        '🚨',
  'Behörde':        '🏛',
  'Steuerbescheid': '📊',
  'Versicherung':   '🛡️',
  'Vertrag':        '📄',
  'Sonstiges':      '📂',
};

interface TypGruppe { typ: string; betrag: number; anzahl: number }
interface AbsenderGruppe { ad: string; betrag: number; anzahl: number }

function TypBalken({ typ, betrag, gesamtBetrag, anzahl, C }: TypGruppe & { gesamtBetrag: number; C: ThemeColors }) {
  const prozent = gesamtBetrag > 0 ? Math.round((betrag / gesamtBetrag) * 100) : 0;
  const farbe = TYP_FARBEN[typ] || '#A5B1C2';
  const ikon  = TYP_IKON[typ]   || '📂';
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 14 }}>{ikon}</Text>
          <Text style={{ fontSize: 13, color: C.text, fontWeight: '500' }}>{typ}</Text>
          <View style={{ backgroundColor: farbe + '22', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
            <Text style={{ fontSize: 10, color: farbe, fontWeight: '700' }}>{anzahl}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{formatBetrag(betrag)}</Text>
          <Text style={{ fontSize: 10, color: C.textTertiary }}>{prozent}%</Text>
        </View>
      </View>
      <View style={{ height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${prozent}%`, backgroundColor: farbe, borderRadius: 4 }} />
      </View>
    </View>
  );
}

function MonatsBalken({ monat, betrag, maxBetrag, C, onPress, isSelected, isPanning }:
  { monat: number; betrag: number; maxBetrag: number; C: ThemeColors; onPress: () => void; isSelected: boolean; isPanning: boolean }) {
  const hoehe    = maxBetrag > 0 ? Math.max(Math.round((betrag / maxBetrag) * 88), betrag > 0 ? 4 : 0) : 0;
  const kurzName = new Date(2000, monat - 1, 1).toLocaleString('de-DE', { month: 'short' });
  const scale    = useSharedValue(1);

  // Dim non-selected bars while panning (#71)
  const dimmed = isPanning && !isSelected;
  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }, { scaleX: scale.value }],
    opacity: withTiming(dimmed ? 0.28 : 1, { duration: 120 }),
  }));

  // Spring pop on selection
  React.useEffect(() => {
    if (isSelected) {
      scale.value = withSpring(1.12, { damping: 10, stiffness: 320 }, () => {
        scale.value = withSpring(1, { damping: 14, stiffness: 260 });
      });
    }
  }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TouchableOpacity onPress={onPress} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 1 }}>
      <View style={{ height: 88, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
        <Animated.View style={[{
          width: '75%', height: hoehe || 2, borderRadius: 4,
          backgroundColor: isSelected ? C.primary : hoehe > 0 ? (C.primary + 'aa') : C.border,
        }, barStyle]} />
      </View>
      <Text style={{
        fontSize: 9,
        color:      isSelected ? C.primary : C.textTertiary,
        marginTop:  3,
        fontWeight: isSelected ? '700' : '400',
        opacity:    dimmed ? 0.28 : 1,
      }}>{kurzName}</Text>
    </TouchableOpacity>
  );
}

function TopAbsender({ absenderListe, C }: { absenderListe: AbsenderGruppe[]; C: ThemeColors }) {
  if (absenderListe.length === 0) return null;
  return (
    <View style={{ backgroundColor: C.bgInput, borderRadius: 14, padding: 14,
      marginBottom: 16, borderWidth: 0.5, borderColor: C.border }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 12 }}>
        🏢 Höchste Ausgaben nach Absender
      </Text>
      {absenderListe.slice(0, 5).map(({ ad, betrag, anzahl }, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7,
          borderBottomWidth: i < Math.min(absenderListe.length, 5) - 1 ? 0.5 : 0,
          borderColor: C.border }}>
          <View style={{ width: 26, height: 26, borderRadius: 13,
            backgroundColor: Object.values(TYP_FARBEN)[i % 8] + '33',
            alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: Object.values(TYP_FARBEN)[i % 8] }}>
              {i + 1}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: C.text, fontWeight: '500' }} numberOfLines={1}>{ad}</Text>
            <Text style={{ fontSize: 10, color: C.textTertiary }}>{anzahl} Dok.</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.danger }}>{formatBetrag(betrag)}</Text>
        </View>
      ))}
    </View>
  );
}

interface BudgetGrafikModalProps {
  visible: boolean;
  onClose: () => void;
  docs: Dokument[];
}

export default function BudgetGrafikModal({ visible, onClose, docs }: BudgetGrafikModalProps) {
  const { Colors: C } = useTheme();
  const mevcutYil = new Date().getFullYear();
  const [seciliYil, setSeciliYil]     = useState(mevcutYil);
  const [seciliMonat, setSeciliMonat] = useState(new Date().getMonth() + 1);

  // ── Haptic chart interaction ──────────────────────────────────────────────
  const [chartWidth, setChartWidth] = useState(0);
  const [isPanning,  setIsPanning]  = useState(false);

  // #72 Spring tooltip — Reanimated SharedValues for smooth tracking
  const tooltipXSV   = useSharedValue(-100);
  const tooltipOpSV  = useSharedValue(0);
  const chartWidthRef = useRef(0);

  const tooltipStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.max(0, Math.min(tooltipXSV.value - 36, chartWidthRef.current - 72)) }],
    opacity:   tooltipOpSV.value,
  }));
  const crosshairStyle = useAnimatedStyle(() => ({
    left:    tooltipXSV.value - 0.75,
    opacity: tooltipOpSV.value,
  }));

  const lastHapticMonat  = useRef(-1);
  const lastHapticTimeMs = useRef(0);

  const handleChartMove = useCallback((pageX: number, chartLeft: number) => {
    if (chartWidthRef.current <= 0) return;
    const relX   = pageX - chartLeft;
    const colW   = chartWidthRef.current / 12;
    const barIdx = Math.max(0, Math.min(11, Math.floor(relX / colW)));
    const monat  = barIdx + 1;

    // Spring tooltip to new position (#72)
    tooltipXSV.value  = withSpring(barIdx * colW + colW / 2, { damping: 22, stiffness: 300, mass: 0.5 });
    tooltipOpSV.value = withTiming(1, { duration: 80 });

    if (monat !== lastHapticMonat.current) {
      lastHapticMonat.current = monat;
      setSeciliMonat(monat);
      const now = Date.now();
      if (now - lastHapticTimeMs.current > 80) {
        lastHapticTimeMs.current = now;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const chartLeftRef = useRef(0);
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: (e) => {
      setIsPanning(true);
      handleChartMove(e.nativeEvent.pageX, chartLeftRef.current);
    },
    onPanResponderMove: (e) => {
      handleChartMove(e.nativeEvent.pageX, chartLeftRef.current);
    },
    onPanResponderRelease: () => {
      setIsPanning(false);
      tooltipOpSV.value = withTiming(0, { duration: 150 });
      lastHapticMonat.current = -1;
    },
    onPanResponderTerminate: () => {
      setIsPanning(false);
      tooltipOpSV.value = withTiming(0, { duration: 150 });
      lastHapticMonat.current = -1;
    },
  }), [handleChartMove]); // eslint-disable-line react-hooks/exhaustive-deps

  const yillar = useMemo(() => {
    const s = new Set(docs
      .map(d => d.datum ? new Date(d.datum).getFullYear() : null)
      .filter((y): y is number => y !== null));
    s.add(mevcutYil);
    return [...s].sort((a, b) => b - a);
  }, [docs, mevcutYil]);

  const { monatsGruppen, typGruppen, absenderGruppen, gesamtBetrag } = useMemo(() => {
    const yilDocs = docs.filter(d =>
      d.datum && new Date(d.datum).getFullYear() === seciliYil && (d.betrag ?? 0) > 0
    );

    const monatsMap: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) monatsMap[i] = 0;
    const typMap: Record<string, { betrag: number; anzahl: number }> = {};
    const absenderMap: Record<string, { betrag: number; anzahl: number }> = {};
    let total = 0;

    yilDocs.forEach(d => {
      const betrag = d.betrag ?? 0;
      const monat  = new Date(d.datum).getMonth() + 1;
      monatsMap[monat] = (monatsMap[monat] || 0) + betrag;
      total += betrag;

      const typ = d.typ || 'Sonstiges';
      typMap[typ] = typMap[typ] || { betrag: 0, anzahl: 0 };
      typMap[typ].betrag  += betrag;
      typMap[typ].anzahl  += 1;

      if (d.absender) {
        absenderMap[d.absender] = absenderMap[d.absender] || { betrag: 0, anzahl: 0 };
        absenderMap[d.absender].betrag += betrag;
        absenderMap[d.absender].anzahl += 1;
      }
    });

    const monatsGruppen = Object.entries(monatsMap).map(([m, b]) => ({ monat: parseInt(m, 10), betrag: b }));
    const typGruppen: TypGruppe[] = Object.entries(typMap)
      .sort((a, b) => b[1].betrag - a[1].betrag)
      .map(([typ, v]) => ({ typ, ...v }));
    const absenderGruppen: AbsenderGruppe[] = Object.entries(absenderMap)
      .sort((a, b) => b[1].betrag - a[1].betrag)
      .map(([ad, v]) => ({ ad, ...v }));

    return { monatsGruppen, typGruppen, absenderGruppen, gesamtBetrag: total };
  }, [docs, seciliYil]);

  const seciliAyDocs = useMemo(() => {
    return docs.filter(d => {
      if (!d.datum) return false;
      const dt = new Date(d.datum);
      return dt.getFullYear() === seciliYil &&
             dt.getMonth() + 1 === seciliMonat &&
             (d.betrag ?? 0) > 0;
    }).sort((a, b) => (b.betrag ?? 0) - (a.betrag ?? 0));
  }, [docs, seciliYil, seciliMonat]);

  const maxMonatsBetrag = Math.max(...monatsGruppen.map(m => m.betrag), 1);
  const seciliAyBetrag  = monatsGruppen.find(m => m.monat === seciliMonat)?.betrag || 0;
  const seciliAyName    = new Date(seciliYil, seciliMonat - 1, 1).toLocaleString('de-DE', { month: 'long' });

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '92%', paddingBottom: 32 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border,
          alignSelf: 'center', marginTop: 12, marginBottom: 8 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.text }}> Ausgaben-Übersicht</Text>
            <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>Nur Dokumente mit Betrag</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {yillar.map(y => (
              <TouchableOpacity key={y} onPress={() => setSeciliYil(y)}
                style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
                  backgroundColor: y === seciliYil ? C.primary : C.bgInput,
                  borderWidth: 0.5, borderColor: y === seciliYil ? C.primary : C.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700',
                  color: y === seciliYil ? '#fff' : C.textSecondary }}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          {gesamtBetrag === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text style={{ fontSize: 15, color: C.textSecondary, marginTop: 12 }}>
                Keine Beträge für {seciliYil}
              </Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: C.dangerLight, borderRadius: 14, padding: 14, marginBottom: 16,
                borderWidth: 0.5, borderColor: C.danger + '44' }}>
                <View>
                  <Text style={{ fontSize: 11, color: C.textTertiary }}>Gesamt {seciliYil}</Text>
                  {/* #70 Counter — animates when year changes */}
                  <AnimatedCounter
                    value={gesamtBetrag}
                    formatter={formatBetrag as (v: number) => string}
                    style={{ fontSize: 22, fontWeight: '800', color: C.danger }}
                  />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: C.textTertiary }}>Ø pro Monat</Text>
                  <AnimatedCounter
                    value={gesamtBetrag / 12}
                    formatter={formatBetrag as (v: number) => string}
                    style={{ fontSize: 16, fontWeight: '700', color: C.text }}
                  />
                </View>
              </View>

              <View style={{ backgroundColor: C.bgInput, borderRadius: 14, padding: 14,
                marginBottom: 16, borderWidth: 0.5, borderColor: C.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 12 }}>
                  Monatlicher Verlauf — Tippen für Details
                </Text>
                {/* Interactive chart — pan + spring tooltip + dimming (#71, #72) */}
                <View
                  style={{ flexDirection: 'row', height: 108, position: 'relative', marginTop: 32 }}
                  onLayout={e => {
                    const w = e.nativeEvent.layout.width;
                    setChartWidth(w);
                    chartWidthRef.current = w;
                    e.target.measure((_x, _y, _w, _h, px) => { chartLeftRef.current = px; });
                  }}
                  {...panResponder.panHandlers}
                >
                  {/* #72 Spring crosshair */}
                  <Animated.View
                    pointerEvents="none"
                    style={[{
                      position: 'absolute', top: 0, width: 1.5, height: 88,
                      backgroundColor: `${C.primary}60`,
                    }, crosshairStyle]}
                  />

                  {/* #72 Spring tooltip + #70 AnimatedCounter */}
                  <Animated.View
                    pointerEvents="none"
                    style={[{
                      position: 'absolute', top: -30,
                      backgroundColor: C.primary, borderRadius: 8,
                      paddingHorizontal: 8, paddingVertical: 4,
                      shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.40, shadowRadius: 8, elevation: 6,
                    }, tooltipStyle]}
                  >
                    <AnimatedCounter
                      value={seciliAyBetrag}
                      formatter={formatBetrag as (v: number) => string}
                      style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}
                    />
                  </Animated.View>

                  {/* #71 Bars with dim effect */}
                  {monatsGruppen.map(m => (
                    <MonatsBalken key={m.monat} monat={m.monat} betrag={m.betrag}
                      maxBetrag={maxMonatsBetrag} C={C}
                      isSelected={m.monat === seciliMonat}
                      isPanning={isPanning}
                      onPress={() => { setSeciliMonat(m.monat); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />
                  ))}
                </View>
              </View>

              {seciliAyBetrag > 0 && (
                <View style={{ backgroundColor: C.bgInput, borderRadius: 14, padding: 14,
                  marginBottom: 16, borderWidth: 0.5, borderColor: C.primary + '44' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>
                       {seciliAyName}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.danger }}>
                      {formatBetrag(seciliAyBetrag)}
                    </Text>
                  </View>
                  {seciliAyDocs.slice(0, 6).map((d, i) => (
                    <View key={d.id} style={{ flexDirection: 'row', justifyContent: 'space-between',
                      alignItems: 'center', paddingVertical: 5,
                      borderTopWidth: i === 0 ? 0 : 0.5, borderColor: C.border }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, color: C.text }} numberOfLines={1}>
                          {TYP_IKON[d.typ] || '📂'} {d.absender || d.titel || d.typ}
                        </Text>
                        <Text style={{ fontSize: 10, color: C.textTertiary }}>{d.typ}</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>
                        {formatBetrag(d.betrag ?? 0)}
                      </Text>
                    </View>
                  ))}
                  {seciliAyDocs.length > 6 && (
                    <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 6, textAlign: 'center' }}>
                      +{seciliAyDocs.length - 6} weitere
                    </Text>
                  )}
                </View>
              )}

              {typGruppen.length > 0 && (
                <View style={{ backgroundColor: C.bgInput, borderRadius: 14, padding: 14,
                  marginBottom: 16, borderWidth: 0.5, borderColor: C.border }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 14 }}>
                    Nach Dokumenttyp
                  </Text>
                  {typGruppen.map(({ typ, betrag, anzahl }) => (
                    <TypBalken key={typ} typ={typ} betrag={betrag}
                      gesamtBetrag={gesamtBetrag} anzahl={anzahl} C={C} />
                  ))}
                </View>
              )}

              <TopAbsender absenderListe={absenderGruppen} C={C} />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
