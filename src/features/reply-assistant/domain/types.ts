export type ReplyRiskLevel = 'low' | 'medium' | 'high';

export type ReplyActionType =
  | 'widerspruch'
  | 'einspruch'
  | 'fristverlaengerung'
  | 'nachreichung'
  | 'klarstellung'
  | 'belegeinsicht'
  | 'antrag'
  | 'korrektur'
  | 'meldung'
  | 'kuendigung'
  | 'ratenzahlung'
  | 'erinnerung'
  | 'request'
  | 'submit'
  | 'dispute'
  | 'demand';

export interface ReplyTemplateField {
  key: string;
  labelKey: string;
  required: boolean;
  multiline?: boolean;
  source?: 'document' | 'user' | 'derived' | 'institution';
}

export interface ReplyTemplateSafety {
  riskLevel: ReplyRiskLevel;
  safetyNoteKey?: string;
  humanReviewRecommended?: boolean;
  forbiddenClaims?: string[];
}

export interface ReplyTemplate {
  id: string;
  locale: 'de';
  version: 1;
  category: string;
  institutionType: string;
  documentType: string;
  actionType: ReplyActionType;
  title: string;
  tone?: string;
  legalRiskNotes?: string;
  requiredFields?: string[];
  optionalFields?: string[];
  sensitiveFields?: string[];
  attachmentHints?: string[];
  subjectTemplate: string;
  body: string;
  safetyNote?: string;
  fields: ReplyTemplateField[];
  safety: ReplyTemplateSafety;
  tags?: string[];
}

export type ReplyTemplateValues = Record<string, string | null | undefined>;

export interface RenderReplyTemplateInput {
  template: ReplyTemplate;
  values: ReplyTemplateValues;
}

export interface RenderReplyTemplateResult {
  ok: boolean;
  subject: string | null;
  body: string | null;
  missingRequiredFields: string[];
  unknownPlaceholders: string[];
  blockedReason?: 'missing_required' | 'unknown_placeholder' | 'invalid_template';
}
