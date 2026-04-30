import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PipelineStatus from '@/design/components/PipelineStatus';
import { styles } from '@/features/scan/styles';
import { ACCENT, BG_PROCESSING } from '@/features/scan/constants';

interface Props {
  pageCount: number;
}

/** Reine UI — Fortschrittsschritte wirken oft schneller als „nur Spinner“. */

export default function AnalysisView({ pageCount }: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(x => Math.min(x + 1, 2)), 950);
    return () => clearInterval(t);
  }, []);

  const steps = useMemo(() => {
    const l1 = pageCount > 1 ? 'Text mehrerer Seiten wird gelesen …' : 'Text wird erkannt …';
    return [
      { label: 'Seiten gespeichert', state: 'done' as const },
      { label: l1, state: tick >= 1 ? ('done' as const) : ('active' as const) },
      {
        label: 'Kernfelder und Kurzfassung …',
        state: tick >= 2 ? ('done' as const) : tick >= 1 ? ('active' as const) : ('pending' as const),
      },
    ];
  }, [pageCount, tick]);

  return (
    <SafeAreaView style={[styles.fill, styles.centerContent, { backgroundColor: BG_PROCESSING }]}>
      <ActivityIndicator size="large" color={ACCENT} />
      <Text style={[styles.processingTitle, { marginTop: 18 }]}>
        Unterlage wird vorbereitet
      </Text>
      <Text style={[styles.processingSubtitle, { marginBottom: 22 }]}>
        Meist wenige Sekunden — etwas mehr bei schwachem Netz oder vielen Seiten ({pageCount}).
      </Text>
      <PipelineStatus steps={steps} />
    </SafeAreaView>
  );
}
