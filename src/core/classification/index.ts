export { DocumentClassifier } from '@/core/classification/DocumentClassifier';
export { RiskAnalyzer } from '@/core/classification/riskAnalyzer';
export type { DocumentType, ClassificationResult } from '@/core/classification/DocumentClassifier';
export type { RiskLevel, RiskAnalysis } from '@/core/classification/riskAnalyzer';

import { DocumentClassifier } from '@/core/classification/DocumentClassifier';
import { RiskAnalyzer } from '@/core/classification/riskAnalyzer';

const classifier = new DocumentClassifier();
const riskAnalyzer = new RiskAnalyzer();

export interface DocumentAnalysis {
  type: import('@/core/classification/DocumentClassifier').DocumentType;
  confidence: number;
  risk: import('@/core/classification/riskAnalyzer').RiskLevel;
  riskScore: number;
  urgencyDays: number | null;
  extractedAmount: number | null;
  extractedIban?: string;
  extractedSender?: string;
  reasons: string[];
}

/**
 * Single-call document analysis: classify type + analyze risk.
 */
export function analyzeDocument(rawText: string): DocumentAnalysis {
  const classification = classifier.classify(rawText);
  const risk = riskAnalyzer.analyze(rawText, classification.type, classification.extractedAmount ?? null);

  return {
    type: classification.type,
    confidence: classification.confidence,
    risk: risk.level,
    riskScore: risk.score,
    urgencyDays: risk.urgencyDays,
    extractedAmount: classification.extractedAmount ?? null,
    extractedIban: classification.extractedIban,
    extractedSender: classification.extractedSender,
    reasons: risk.reasons,
  };
}
