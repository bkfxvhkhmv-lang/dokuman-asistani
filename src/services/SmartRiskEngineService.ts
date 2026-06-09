/** Smart Risk Engine — `./smart-risk-engine/` */
export type {
  RiskLevel,
  RiskTrend,
  RiskFactor,
  RiskReduction,
  PeerComparison,
  RiskEngineResult,
  PortfolioRisk,
} from '@/services/smart-risk-engine';
export { runSmartRiskEngine, buildPortfolioRisk } from '@/services/smart-risk-engine';
