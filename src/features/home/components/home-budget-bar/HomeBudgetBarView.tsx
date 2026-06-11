import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import GlassCard from '@/design/components/GlassCard';
import { useTheme } from '@/ThemeContext';
import { useStore } from '@/store';
import { formatBetrag } from '@/utils';
import {
  analyzeAllTargets,
  getMostCriticalTarget,
  TARGET_STATUS_COLOR,
} from '@/services/TargetService';
import BudgetTargetModal from '@/features/home/modals/BudgetTargetModal';

import type { HomeBudgetBarProps } from '@/features/home/components/home-budget-bar/types';
import { buildGreeting } from '@/features/home/components/home-budget-bar/greeting';
import { SPARK_W } from '@/features/home/components/home-budget-bar/constants';
import { computeSparkGeometry, computeTargetSparkY } from '@/features/home/components/home-budget-bar/sparkGeometry';
import { homeBudgetStyles as st } from '@/features/home/components/home-budget-bar/styles';
import { BudgetChip } from '@/features/home/components/home-budget-bar/BudgetChip';
import { useCriticalPulse } from '@/features/home/components/home-budget-bar/useCriticalPulse';
import { CriticalGlowLayers } from '@/features/home/components/home-budget-bar/CriticalGlowLayers';
import { BudgetSparkRegion } from '@/features/home/components/home-budget-bar/BudgetSparkRegion';
import { BudgetTargetProgressSection } from '@/features/home/components/home-budget-bar/BudgetTargetProgressSection';
import { BudgetInsightFooter } from '@/features/home/components/home-budget-bar/BudgetInsightFooter';
import { useT } from '@/hooks/useT';

export default function HomeBudgetBarView({ budget, docs, onPress: _onPress }: HomeBudgetBarProps) {
  void _onPress;
  const { Colors, S } = useTheme();
  const { t } = useT();
  const { state } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeBucket, setActiveBucket] = useState<number | null>(null);

  const handleSparkTouch = useCallback((e: { nativeEvent: { locationX: number } }) => {
    const x = e.nativeEvent.locationX;
    const i = Math.round((x / SPARK_W) * Math.max(budget.monthlyBuckets.length - 1, 1));
    setActiveBucket(Math.max(0, Math.min(i, budget.monthlyBuckets.length - 1)));
  }, [budget.monthlyBuckets.length]);

  const targets = state.einstellungen.budgetTargets ?? [];
  const analyses = useMemo(() => analyzeAllTargets(targets, docs), [targets, docs]);
  const topTarget = getMostCriticalTarget(analyses);

  const accentColor = topTarget
    ? TARGET_STATUS_COLOR[topTarget.status]
    : (budget.unpaidCount > 0 ? Colors.danger : Colors.success);

  const { sparkPoints, areaPath, lastX, lastY } = useMemo(
    () => computeSparkGeometry(budget.monthlyBuckets),
    [budget.monthlyBuckets],
  );

  const targetY = useMemo(
    () => computeTargetSparkY(budget.monthlyBuckets, topTarget),
    [budget.monthlyBuckets, topTarget],
  );

  const isKritisch = !!(topTarget?.status === 'kritisch');
  const pulseStyle = useCriticalPulse(isKritisch);

  const hasTarget = !!topTarget;
  const pctFilled = hasTarget ? Math.min(topTarget!.pct, 1) : 0;
  const statusColor = hasTarget ? TARGET_STATUS_COLOR[topTarget!.status] : accentColor;
  const greeting = buildGreeting();
  const insight = budget.insights?.[0];

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalOpen(true)}
        activeOpacity={0.88}
        style={[st.wrapper, { marginHorizontal: S.lg, marginBottom: 14 }]}
      >
        <Animated.View style={hasTarget && topTarget?.status === 'kritisch' ? pulseStyle : undefined}>
          <CriticalGlowLayers
            show={hasTarget && topTarget?.status === 'kritisch'}
            pulseStyle={pulseStyle}
            statusColor={statusColor}
          />
          <GlassCard
            accentColor={accentColor}
            intensity={38}
            style={[st.card, { shadowColor: accentColor }]}
          >
            {greeting && (
              <Text style={[st.greeting, { color: Colors.textTertiary }]}>{greeting}</Text>
            )}

            <View style={st.row}>
              <View style={st.left}>
                <Text style={[st.metaLabel, { color: Colors.textTertiary }]}>
                  {hasTarget
                    ? `Monatsziel: ${formatBetrag(topTarget!.target.limitBetrag) ?? '–'}`
                    : 'Offene Belastung'}
                </Text>
                <Text style={[st.bigAmount, { color: accentColor }]}>
                  {formatBetrag(budget.totalOpen) ?? '€0'}
                </Text>
                <View style={st.chips}>
                  <BudgetChip label={`${formatBetrag(budget.thisMonthTotal) ?? '€0'} / Monat`} color="#4361EE" />
                  {budget.unpaidCount > 0
                    ? <BudgetChip label={`${budget.unpaidCount} unbezahlt`} color={Colors.danger} />
                    : <BudgetChip label={t('budget.all_paid')} color={Colors.success} />}
                  {budget.nextMonthEstimate > 0 && (
                    <BudgetChip
                      label={`~${formatBetrag(budget.nextMonthEstimate) ?? '–'} nächsten Monat`}
                      color="#7C6EF8"
                    />
                  )}
                </View>
              </View>

              <BudgetSparkRegion
                budget={budget}
                accentColor={accentColor}
                statusColor={statusColor}
                colors={{
                  bgCard: Colors.bgCard,
                  border: Colors.border,
                  textSecondary: Colors.textSecondary,
                  textTertiary: Colors.textTertiary,
                }}
                targetY={targetY}
                sparkPoints={sparkPoints}
                areaPath={areaPath}
                lastX={lastX}
                lastY={lastY}
                activeBucket={activeBucket}
                onSparkPress={handleSparkTouch}
                onSparkPressOutDelayed={() => setActiveBucket(null)}
              />
            </View>

            {hasTarget && (
              <BudgetTargetProgressSection
                topTarget={topTarget!}
                pctFilled={pctFilled}
                statusColor={statusColor}
              />
            )}

            <BudgetInsightFooter insight={insight} hasTarget={hasTarget} />
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
