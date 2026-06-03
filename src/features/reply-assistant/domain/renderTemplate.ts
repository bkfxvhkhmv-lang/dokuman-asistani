import type {
  RenderReplyTemplateInput,
  RenderReplyTemplateResult,
  ReplyTemplate,
  ReplyTemplateValues,
} from './types';

export const VALID_FIELD_KEY_REGEX = /^[a-z0-9_]+$/;
export const PLACEHOLDER_REGEX = /{{(?!#if\b|\/if\b)([a-z0-9_]+)}}/g;
const CONDITIONAL_TOKEN_REGEX = /{{#if\s+([^}]+)}}|{{\/if}}/g;
const SENTINEL_PREFIX = '__BP_EMPTY__';

function hasNonEmptyValue(values: ReplyTemplateValues, key: string): boolean {
  const value = values[key];
  return typeof value === 'string' ? value.trim().length > 0 : false;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function sanitizeOutput(text: string): string {
  return text
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getDeclaredFieldKeys(template: ReplyTemplate): Set<string> {
  return new Set(template.fields.map(field => field.key));
}

function findUnknownPlaceholders(text: string, declaredKeys: Set<string>): string[] {
  const unknown: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER_REGEX)) {
    const key = match[1];
    if (!declaredKeys.has(key)) unknown.push(key);
  }
  return unique(unknown);
}

function resolveConditionals(
  text: string,
  values: ReplyTemplateValues,
  declaredKeys: Set<string>,
): { ok: true; text: string } | { ok: false } {
  let output = '';
  let lastIndex = 0;
  let openField: string | null = null;
  let openContentStart = 0;

  for (const match of text.matchAll(CONDITIONAL_TOKEN_REGEX)) {
    const token = match[0];
    const tokenIndex = match.index ?? 0;
    const conditionalField = match[1]?.trim();

    if (openField === null) {
      if (token === '{{/if}}') return { ok: false };
      if (!conditionalField || !VALID_FIELD_KEY_REGEX.test(conditionalField)) return { ok: false };
      if (!declaredKeys.has(conditionalField)) return { ok: false };

      output += text.slice(lastIndex, tokenIndex);
      openField = conditionalField;
      openContentStart = tokenIndex + token.length;
      lastIndex = openContentStart;
      continue;
    }

    if (token !== '{{/if}}') return { ok: false };

    const content = text.slice(openContentStart, tokenIndex);
    if (hasNonEmptyValue(values, openField)) {
      output += content;
    }
    openField = null;
    lastIndex = tokenIndex + token.length;
  }

  if (openField !== null) return { ok: false };

  output += text.slice(lastIndex);
  return { ok: true, text: output };
}

function replacePlaceholders(
  text: string,
  values: ReplyTemplateValues,
  template: ReplyTemplate,
): string {
  const fieldMap = new Map(template.fields.map(field => [field.key, field]));

  return text.replace(PLACEHOLDER_REGEX, (_match, key: string) => {
    const field = fieldMap.get(key);
    if (!field) return '';

    const value = values[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : (field.required ? '' : `${SENTINEL_PREFIX}${key}__`);
    }
    return field.required ? '' : `${SENTINEL_PREFIX}${key}__`;
  });
}

function cleanupOptionalLines(text: string): string {
  const cleaned = text
    .split('\n')
    .filter(line => !line.includes(SENTINEL_PREFIX))
    .join('\n')
    .replace(new RegExp(`${SENTINEL_PREFIX}[a-z0-9_]+__`, 'g'), '');

  return sanitizeOutput(cleaned);
}

function renderString(
  text: string,
  values: ReplyTemplateValues,
  template: ReplyTemplate,
  declaredKeys: Set<string>,
): { ok: true; text: string } | { ok: false } {
  const conditionalResult = resolveConditionals(text, values, declaredKeys);
  if (!conditionalResult.ok) return { ok: false };

  const replaced = replacePlaceholders(conditionalResult.text, values, template);
  return { ok: true, text: cleanupOptionalLines(replaced) };
}

export function renderReplyTemplate({
  template,
  values,
}: RenderReplyTemplateInput): RenderReplyTemplateResult {
  const declaredKeys = getDeclaredFieldKeys(template);
  const missingRequiredFields = unique(
    template.fields
      .filter(field => field.required && !hasNonEmptyValue(values, field.key))
      .map(field => field.key),
  );
  const unknownPlaceholders = unique([
    ...findUnknownPlaceholders(template.subjectTemplate, declaredKeys),
    ...findUnknownPlaceholders(template.body, declaredKeys),
  ]);

  if (missingRequiredFields.length > 0) {
    return {
      ok: false,
      subject: null,
      body: null,
      missingRequiredFields,
      unknownPlaceholders,
      blockedReason: 'missing_required',
    };
  }

  if (unknownPlaceholders.length > 0) {
    return {
      ok: false,
      subject: null,
      body: null,
      missingRequiredFields: [],
      unknownPlaceholders,
      blockedReason: 'unknown_placeholder',
    };
  }

  const renderedSubject = renderString(template.subjectTemplate, values, template, declaredKeys);
  const renderedBody = renderString(template.body, values, template, declaredKeys);

  if (!renderedSubject.ok || !renderedBody.ok) {
    return {
      ok: false,
      subject: null,
      body: null,
      missingRequiredFields: [],
      unknownPlaceholders: [],
      blockedReason: 'invalid_template',
    };
  }

  return {
    ok: true,
    subject: renderedSubject.text,
    body: renderedBody.text,
    missingRequiredFields: [],
    unknownPlaceholders: [],
  };
}
