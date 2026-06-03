export const REPLY_TEMPLATE_LEGAL_SAFETY_RULES_DE = {
  version: 1,
  locale: 'de' as const,
  globalRules: [
    'No guaranteed legal outcome claims.',
    'No fabricated facts or evidence.',
    'No impersonation of legal counsel.',
    'No automatic escalation into legal strategy.',
    'Rendered drafts must always go through user review before sending.',
  ],
  rendererPolicies: {
    allowEval: false,
    allowRemoteExecution: false,
    allowUnknownPlaceholders: false,
    allowNestedConditionals: false,
    allowElseBlocks: false,
    blockOnMissingRequired: true,
    blockOnInvalidConditionalTag: true,
  },
} as const;
