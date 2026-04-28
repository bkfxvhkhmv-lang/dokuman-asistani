import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Polyline, Circle, Line, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

// Skia neon glow — #78
let SkCanvas: any = null, SkRect: any = null, SkBlurMask: any = null, SkPaint: any = null;
try {
  const S = require('@shopify/react-native-skia');
  SkCanvas = S.Canvas; SkRect = S.Rect; SkBlurMask = S.BlurMask; SkPaint = S.Paint;
} catch {}
const SKIA_OK = SkCanvas !== null;
import GlassCard from '../../../design/components/GlassCard';
import { useTheme } from '../../../ThemeContext';
import { useStore } from '../../../store';
import { formatBetrag } from '../../../utils';
import { analyzeAllTargets, getMostCriticalTarget, TARGET_STATUS_COLOR } from '../../../services/TargetService';
import BudgetTargetModal from '../modals/BudgetTargetModal';
import type { BudgetSnapshot } from '../../../services/BudgetEngine';
import type { Dokument } from '../../../store';

interface Props {
  budget:   BudgetSnapshot;
  docs:     Dokument[];        // needed for target analysis
  onPress?: () => void;
}

const W = 90, H = 32;

export default function HomeBudgetBar({ budget, docs, onPress }: Props) {
  const { Colors, S } = useTheme();
  const { state } = useStore();
  const [modalOpen, setModalOpen]           = useState(false);
  const [activeBucket, setActiveBucket]     = useState<number | null>(null);

  const handleSparkTouch = useCallback((e: any) => {
    const x  = e.nativeEvent.locationX;
    const i  = Math.round((x / W) * Math.max(budget.monthlyBuckets.length - 1, 1));
    setActiveBucket(Math.max(0, Math.min(i, budget.monthlyBuckets.length - 1)));
  }, [budget.monthlyBuckets.length]);

  // ── Target analysis ───────────────────────────────────────────────────
  const targets  = state.einstellungen.budgetTargets ?? [];
  const analyses = useMemo(() => analyzeAllTargets(targets, docs), [targets, docs]);
  const topTarget = getMostCriticalTarget(analyses);

  // Primary accent: status color if target set, else default
  const accentColor = topTarget
    ? TARGET_STATUS_COLOR[topTarget.status]
    : (budget.unpaidCount > 0 ? '#EE6055' : '#1D9E75');

  // ── Sparkline ─────────────────────────────────────────────────────────
  const { sparkPoints, areaPath, lastX, lastY } = useMemo(() => {
    const vals   = budget.monthlyBuckets.map(b => b.total);
    const maxVal = Math.max(...vals, 1);
    const bottom = H + 6;
    const pts    = vals.map((v, i) => {
      const x = (i / Math.max(vals.length - 1, 1)) * W;
      const y = H - (v / maxVal) * H * 0.85 - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const last = pts[pts.length - 1].split(',');

    // Area path: drop to bottom left → trace line → drop to bottom right → close
    const firstX = pts[0].split(',')[0];
    const lastPt = pts[pts.length - 1].split(',')[0];
    const area   = `M${firstX},${bottom} ${pts.map(p => `L${p}`).join(' ')} L${lastPt},${bottom} Z`;

    return {
      sparkPoints: pts.join(' '),
      areaPath:    area,
      lastX:  parseFloat(last[0]),
      lastY:  parseFloat(last[1]),
    };
  }, [budget.monthlyBuckets]);

  // Target line position on sparkline (horizontal)
  const targetY = useMemo(() => {
    if (!topTarget) return null;
    const vals   = budget.monthlyBuckets.map(b => b.total);
    const maxVal = Math.max(...vals, 1);
    const limit  = topTarget.target.limitBetrag;
    if (limit <= 0 || limit > maxVal * 1.5) return null;
    return H - (limit / maxVal) * H * 0.85 - 2;
  }, [budget.monthlyBuckets, topTarget]);

  // ── Pulse for kritisch — in useEffect to avoid render-body side-effects ──
  const { isSimpleMode } = useTheme();
  const pulseOp = useSharedValue(1);
  useEffect(() => {
    if (topTarget?.status === 'kritisch') {
      // #103 Simple Mode: slower, wider pulse for max visibility
      const dur = isSimpleMode ? 1400 : 700;
      pulseOp.value = withRepeat(
        withSequence(withTiming(isSimpleMode ? 0.35 : 0.5, { duration: dur }), withTiming(1, { duration: dur })),
        -1, true,
      );
      return () => cancelAnimation(pulseOp);
    } else {
      cancelAnimation(pulseOp);
      pulseOp.value = 1;
    }
  }, [topTarget?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOp.value }));

  const hasTarget  = !!topTarget;
  const pctFilled  = hasTarget ? Math.min(topTarget.pct, 1) : 0;
  const statusColor = hasTarget ? TARGET_STATUS_COLOR[topTarget.status] : accentColor;
  const greeting   = buildGreeting();
  const insight    = budget.insights[0];

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalOpen(true)}
        activeOpacity={0.88}
        style={[st.wrapper, { marginHorizontal: S.lg, marginBottom: 14 }]}
      >
        <Animated.View style={hasTarget && topTarget?.status === 'kritisch' ? pulseStyle : undefined}>
          {/* #78 Skia neon glow — pulsing halo behind card when kritisch */}
          {SKIA_OK && hasTarget && topTarget?.status === 'kritisch' && (
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { margin: -16, borderRadius: 30 }, pulseStyle]}
            >
              <SkCanvas style={{ flex: 1 }}>
                <SkRect x={16} y={16} width={0} height={0} color="transparent">
                  <SkBlurMask blur={22} style="normal" />
                </SkRect>
              </SkCanvas>
            </Animated.View>
          )}
          {/* Non-Skia fallback glow */}
          {!SKIA_OK && hasTarget && topTarget?.status === 'kritisch' && (
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  margin: -10, borderRadius: 28,
                  backgroundColor: `${statusColor}18`,
                  shadowColor: statusColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.65,
                  shadowRadius: 22,
                  elevation: 12,
                },
                pulseStyle,
              ]}
            />
          )}
          <GlassCard
            accentColor={accentColor}
            intensity={38}
            style={[st.card, { shadowColor: accentColor }]}
          >
            {greeting && (
              <Text style={[st.greeting, { color: Colors.textTertiary }]}>{greeting}</Text>
            )}

            {/* Main row */}
            <View style={st.row}>
              <View style={st.left}>
                <Text style={[st.metaLabel, { color: Colors.textTertiary }]}>
                  {hasTarget ? `Monatsziel: ${formatBetrag(topTarget!.target.limitBetrag) ?? '–'}` : 'Offene Belastung'}
                </Text>
                <Text style={[st.bigAmount, { color: accentColor }]}>
                  {formatBetrag(budget.totalOpen) ?? '€0'}
                </Text>
                <View style={st.chips}>
                  <Chip label={`${formatBetrag(budget.thisMonthTotal) ?? '€0'} / Monat`} color="#4361EE" />
                  {budget.unpaidCount > 0
                    ? <Chip label={`${budget.unpaidCount} unbezahlt`}    color="#EE6055" />
                    : <Chip label="Alles bezahlt ✓"                     color="#1D9E75" />
                  }
                  {budget.nextMonthEstimate > 0 && (
                    <Chip label={`~${formatBetrag(budget.nextMonthEstimate) ?? '–'} nächsten Monat`} color="#7C6EF8" />
                  )}
                </View>
              </View>

              {/* Interactive sparkline */}
              <View style={st.right}>
                <View style={{ position: 'relative' }}>
                  {/* Tooltip */}
                  {activeBucket !== null && budget.monthlyBuckets[activeBucket] && (
                    <View style={[st.tooltip, {
                      left: Math.max(0, (activeBucket / Math.max(budget.monthlyBuckets.length - 1, 1)) * W - 28),
                      backgroundColor: Colors.bgCard,
                      borderColor: Colors.border,
                    }]}>
                      <Text style={[st.tooltipLabel, { color: Colors.textSecondary }]}>
                        {budget.monthlyBuckets[activeBucket].label}
                      </Text>
                      <Text style={[st.tooltipAmount, { color: accentColor }]}>
                        {budget.monthlyBuckets[activeBucket].total > 0
                          ? `€${Math.round(budget.monthlyBuckets[activeBucket].total)}`
                          : '–'}
                      </Text>
                    </View>
                  )}

                  <Svg width={W} height={H + 6}>
                    <Defs>
                      <SvgGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%"   stopColor={accentColor} stopOpacity={0.28} />
                        <Stop offset="100%" stopColor={accentColor} stopOpacity={0}    />
                      </SvgGradient>
                    </Defs>

                    {/* #75 Area fill under sparkline */}
                    <Path d={areaPath} fill="url(#areaFill)" />

                    {targetY !== null && (
                      <Line x1={0} y1={targetY} x2={W} y2={targetY}
                        stroke={statusColor} strokeWidth={1} strokeDasharray="4,3" opacity={0.7} />
                    )}
                    <Polyline points={sparkPoints} fill="none" stroke={accentColor}
                      strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                    <Circle cx={lastX} cy={lastY} r={3} fill={accentColor} />
                    {/* Active bucket dot */}
                    {activeBucket !== null && (() => {
                      const bx = (activeBucket / Math.max(budget.monthlyBuckets.length - 1, 1)) * W;
                      const vals = budget.monthlyBuckets.map(b => b.total);
                      const maxV = Math.max(...vals, 1);
                      const by   = H - (vals[activeBucket] / maxV) * H * 0.85 - 2;
                      return <Circle cx={bx} cy={by} r={5} fill={accentColor} opacity={0.9} />;
                    })()}
                  </Svg>

                  {/* Touch capture overlay */}
                  <Pressable
                    style={{ position: 'absolute', inset: 0 }}
                    onPress={handleSparkTouch}
                    onPressOut={() => setTimeout(() => setActiveBucket(null), 1800)}
                  />
                </View>
                <Text style={[st.bucketLabel, { color: Colors.textTertiary }]}>
                  {activeBucket !== null
                    ? budget.monthlyBuckets[activeBucket]?.label
                    : budget.monthlyBuckets[budget.monthlyBuckets.length - 1]?.label ?? ''}
                </Text>
              </View>
            </View>

            {/* Target progress bar */}
            {hasTarget && (
              <View style={st.progressSection}>
                <View style={[st.progressTrack, { backgroundColor: Colors.bgInput }]}>
                  <View style={[st.progressFill, { width: `${pctFilled * 100}%`, backgroundColor: statusColor }]} />
                  {/* Projected marker */}
                  {topTarget!.projectedPct < 1.3 && topTarget!.projectedPct > pctFilled && (
                    <View style={[
                      st.projectedMarker,
                      { left: `${Math.min(topTarget!.projectedPct * 100, 97)}%`, backgroundColor: statusColor },
                    ]} />
                  )}
                </View>
                <View style={st.progressLabels}>
                  <Text style={[st.progressLabel, { color: statusColor }]}>
                    {topTarget!.statusLabel} · {Math.round(topTarget!.pct * 100)}%
                  </Text>
                  <Text style={[st.velocityText, { color: Colors.textTertiary }]}>
                    {topTarget!.velocityStr}
                  </Text>
                </View>
              </View>
            )}

            {/* Insight or "Ziel setzen" CTA */}
            {insight ? (
              <View style={[st.insightRow, { borderTopColor: 'rgba(0,0,0,0.07)' }]}>
                <Text style={[st.insightText, {
                  color: insight.severity === 'hoch'   ? '#EE6055'
                       : insight.severity === 'mittel' ? '#FFB703'
                       : Colors.textSecondary,
                }]}>
                  {insight.type === 'anomalie' ? '⚠️ ' : insight.type === 'vorhersage' ? '🔮 ' : '💡 '}
                  {insight.text}
                </Text>
              </View>
            ) : !hasTarget ? (
              <View style={[st.insightRow, { borderTopColor: 'rgba(0,0,0,0.07)' }]}>
                <Text style={[st.insightText, { color: Colors.primary }]}>
                  🎯 Monatsziel setzen — Tippe hier
                </Text>
              </View>
            ) : null}
          </GlassCard>
        </Animated.View>
      </TouchableOpacity>

      <BudgetTargetModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        docs={docs}
      />
    </>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[st.chip, { backgroundColor: `${color}18` }]}>
      <Text style={[st.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function buildGreeting(): string | null {
  const h = new Date().getHours();
  if (h < 5)  return null;
  if (h < 12) return 'Guten Morgen';
  if (h < 17) return 'Guten Tag';
  if (h < 22) return 'Guten Abend';
  return null;
}

const st = StyleSheet.create({
  wrapper:         {},
  card:            { padding: 16, shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  greeting:        { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 },
  row:             { flexDirection: 'row', alignItems: 'center', gap: 12 },
  left:            { flex: 1 },
  right:           { alignItems: 'flex-end', gap: 4 },
  metaLabel:       { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  bigAmount:       { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  chips:           { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 9 },
  chip:            { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  chipText:        { fontSize: 10, fontWeight: '700' },
  bucketLabel:     { fontSize: 9, fontWeight: '600' },
  tooltip:         { position: 'absolute', top: -40, borderRadius: 8, borderWidth: 0.5, paddingHorizontal: 7, paddingVertical: 4, zIndex: 10, alignItems: 'center', minWidth: 56 },
  tooltipLabel:    { fontSize: 9, fontWeight: '600' },
  tooltipAmount:   { fontSize: 11, fontWeight: '800' },
  progressSection: { marginTop: 12, gap: 5 },
  progressTrack:   { height: 6, borderRadius: 3, overflow: 'visible', position: 'relative' },
  progressFill:    { height: '100%', borderRadius: 3 },
  projectedMarker: { position: 'absolute', top: -3, width: 2, height: 12, borderRadius: 1 },
  progressLabels:  { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel:   { fontSize: 11, fontWeight: '700' },
  velocityText:    { fontSize: 10, fontWeight: '500' },
  insightRow:      { borderTopWidth: 0.5, marginTop: 12, paddingTop: 10 },
  insightText:     { fontSize: 12, fontWeight: '500', lineHeight: 17 },
});
