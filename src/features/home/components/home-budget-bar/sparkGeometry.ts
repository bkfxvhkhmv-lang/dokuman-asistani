import type { MonthlyBucket } from '@/services/BudgetEngine';
import type { TargetAnalysis } from '@/services/TargetService';
import { SPARK_H as H, SPARK_W as W } from '@/features/home/components/home-budget-bar/constants';

export interface SparkGeometry {
  sparkPoints: string;
  areaPath: string;
  lastX: number;
  lastY: number;
}

export function computeSparkGeometry(monthlyBuckets: MonthlyBucket[]): SparkGeometry {
  if (monthlyBuckets.length === 0) {
    return { sparkPoints: '', areaPath: '', lastX: 0, lastY: H };
  }

  const vals = monthlyBuckets.map(b => b.total);
  const maxVal = Math.max(...vals, 1);
  const bottom = H + 6;
  const pts = vals.map((v, i) => {
    const x = (i / Math.max(vals.length - 1, 1)) * W;
    const y = H - (v / maxVal) * H * 0.85 - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = pts[pts.length - 1].split(',');

  const firstX = pts[0].split(',')[0];
  const lastPt = pts[pts.length - 1].split(',')[0];
  const area = `M${firstX},${bottom} ${pts.map(p => `L${p}`).join(' ')} L${lastPt},${bottom} Z`;

  return {
    sparkPoints: pts.join(' '),
    areaPath: area,
    lastX: parseFloat(last[0]),
    lastY: parseFloat(last[1]),
  };
}

export function computeTargetSparkY(
  monthlyBuckets: MonthlyBucket[],
  topTarget: Pick<TargetAnalysis, 'target'> | null | undefined,
  height = H,
): number | null {
  if (!topTarget) return null;
  const vals = monthlyBuckets.map(b => b.total);
  const maxVal = Math.max(...vals, 1);
  const limit = topTarget.target.limitBetrag;
  if (limit <= 0 || limit > maxVal * 1.5) return null;
  return height - (limit / maxVal) * height * 0.85 - 2;
}
