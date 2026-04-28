/**
 * useSmartRiskEngine — V12 Sprint 3
 */

import { useMemo } from 'react';
import {
  runSmartRiskEngine,
  buildPortfolioRisk,
  type RiskEngineResult,
  type PortfolioRisk,
} from '../services/SmartRiskEngineService';
import type { Dokument } from '../store';

export function useDocumentRisk(dok: Dokument | null, alleDocs: Dokument[] = []): RiskEngineResult | null {
  return useMemo(() => (dok ? runSmartRiskEngine(dok, alleDocs) : null), [dok, alleDocs]);
}

export function usePortfolioRisk(docs: Dokument[]): PortfolioRisk {
  return useMemo(() => buildPortfolioRisk(docs), [docs]);
}
