import { View, Text, Pressable } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  Path,
  Polyline,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';
import type { BudgetSnapshot } from '@/services/BudgetEngine';
import { SPARK_W as W, SPARK_H as H } from '@/features/home/components/home-budget-bar/constants';
import { homeBudgetStyles as st } from '@/features/home/components/home-budget-bar/styles';

interface ColorsSubset {
  bgCard: string;
  border: string;
  textSecondary: string;
  textTertiary: string;
}

interface Props {
  budget: BudgetSnapshot;
  accentColor: string;
  statusColor: string;
  colors: ColorsSubset;
  targetY: number | null;
  sparkPoints: string;
  areaPath: string;
  lastX: number;
  lastY: number;
  activeBucket: number | null;
  onSparkPress: (e: { nativeEvent: { locationX: number } }) => void;
  onSparkPressOutDelayed: () => void;
}

export function BudgetSparkRegion({
  budget,
  accentColor,
  statusColor,
  colors,
  targetY,
  sparkPoints,
  areaPath,
  lastX,
  lastY,
  activeBucket,
  onSparkPress,
  onSparkPressOutDelayed,
}: Props) {
  return (
    <View style={st.right}>
      <View style={{ position: 'relative' }}>
        {activeBucket !== null && budget.monthlyBuckets[activeBucket] && (
          <View style={[st.tooltip, {
            left: Math.max(0, (activeBucket / Math.max(budget.monthlyBuckets.length - 1, 1)) * W - 28),
            backgroundColor: colors.bgCard,
            borderColor: colors.border,
          }]}>
            <Text style={[st.tooltipLabel, { color: colors.textSecondary }]}>
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
              <Stop offset="0%" stopColor={accentColor} stopOpacity={0.28} />
              <Stop offset="100%" stopColor={accentColor} stopOpacity={0} />
            </SvgGradient>
          </Defs>

          <Path d={areaPath} fill="url(#areaFill)" />

          {targetY !== null && (
            <Line
              x1={0}
              y1={targetY}
              x2={W}
              y2={targetY}
              stroke={statusColor}
              strokeWidth={1}
              strokeDasharray="4,3"
              opacity={0.7}
            />
          )}
          <Polyline points={sparkPoints} fill="none" stroke={accentColor}
            strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={lastX} cy={lastY} r={3} fill={accentColor} />
          {activeBucket !== null && (() => {
            const bx = (activeBucket / Math.max(budget.monthlyBuckets.length - 1, 1)) * W;
            const vals = budget.monthlyBuckets.map(b => b.total);
            const maxV = Math.max(...vals, 1);
            const by = H - (vals[activeBucket] / maxV) * H * 0.85 - 2;
            return <Circle cx={bx} cy={by} r={5} fill={accentColor} opacity={0.9} />;
          })()}
        </Svg>

        <Pressable
          style={{ position: 'absolute', inset: 0 }}
          onPress={onSparkPress}
          onPressOut={() => setTimeout(onSparkPressOutDelayed, 1800)}
        />
      </View>
      <Text style={[st.bucketLabel, { color: colors.textTertiary }]}>
        {activeBucket !== null
          ? budget.monthlyBuckets[activeBucket]?.label
          : budget.monthlyBuckets[budget.monthlyBuckets.length - 1]?.label ?? ''}
      </Text>
    </View>
  );
}
