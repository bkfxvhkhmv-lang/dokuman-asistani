import type { ReplyTemplate } from '@/features/reply-assistant/domain/types';

export const REPLY_ASSISTANT_DISCLAIMER_STORAGE_KEY = 'reply_assistant_beta_disclaimer_seen_v1';

export const REPLY_ASSISTANT_GLOBAL_BANNER =
  'Nur Entwurf • Kein Rechtsrat • Vor dem Versand selbst prüfen';

export const REPLY_ASSISTANT_HIGH_RISK_BANNER =
  '⚠ Dieses Schreiben kann rechtliche oder finanzielle Folgen haben.\nPrüfen Sie den Text sorgfältig und passen Sie ihn an Ihre Situation an.\nBei Zweifel: Fachberatung einholen.';

export function shouldShowHighRiskWarning(template?: Pick<ReplyTemplate, 'safety'> | null): boolean {
  if (!template) return false;
  return template.safety.riskLevel === 'high' || template.safety.requiresLegalCaution === true;
}
