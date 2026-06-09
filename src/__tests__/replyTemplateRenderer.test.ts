import { renderReplyTemplate, PLACEHOLDER_REGEX, VALID_FIELD_KEY_REGEX } from '@/features/reply-assistant/domain/renderTemplate';
import type { ReplyTemplate } from '@/features/reply-assistant/domain/types';

const baseTemplate: ReplyTemplate = {
  id: 'finanzamt_missing_receipts_005',
  locale: 'de',
  version: 1,
  category: 'Finanzamt',
  institutionType: 'Finanzamt',
  documentType: 'Nachforderung',
  actionType: 'nachreichung',
  title: 'Belege nachreichen',
  subjectTemplate: 'Unterlagen zu {{aktenzeichen}}',
  body: [
    'Guten Tag,',
    '',
    '{{#if aktenzeichen}}Aktenzeichen: {{aktenzeichen}}{{/if}}',
    '{{#if steuernummer}}Steuernummer: {{steuernummer}}{{/if}}',
    'ich reiche die angeforderten Unterlagen nach.',
    '{{#if zusatzinfo}}Hinweis: {{zusatzinfo}}{{/if}}',
    '',
    'Mit freundlichen Grüßen',
    '{{name}}',
  ].join('\n'),
  fields: [
    { key: 'aktenzeichen', labelKey: 'reply.field.aktenzeichen', required: true },
    { key: 'steuernummer', labelKey: 'reply.field.steuernummer', required: false },
    { key: 'zusatzinfo', labelKey: 'reply.field.zusatzinfo', required: false, multiline: true },
    { key: 'name', labelKey: 'reply.field.name', required: true },
  ],
  safety: {
    riskLevel: 'low',
  },
};

describe('reply template renderer core', () => {
  it('renders subject and body when required fields are present', () => {
    const result = renderReplyTemplate({
      template: baseTemplate,
      values: {
        aktenzeichen: 'AZ-123',
        steuernummer: '12/345/67890',
        zusatzinfo: 'Belege fehlen noch.',
        name: 'Max Mustermann',
      },
    });

    expect(result.ok).toBe(true);
    expect(result.subject).toBe('Unterlagen zu AZ-123');
    expect(result.body).toContain('Aktenzeichen: AZ-123');
    expect(result.body).toContain('Steuernummer: 12/345/67890');
    expect(result.body).toContain('Hinweis: Belege fehlen noch.');
  });

  it('removes optional conditional blocks when field is empty', () => {
    const result = renderReplyTemplate({
      template: baseTemplate,
      values: {
        aktenzeichen: 'AZ-123',
        steuernummer: '',
        zusatzinfo: '',
        name: 'Max Mustermann',
      },
    });

    expect(result.ok).toBe(true);
    expect(result.body).not.toContain('Steuernummer:');
    expect(result.body).not.toContain('Hinweis:');
    expect(result.body).toContain('Mit freundlichen Grüßen');
  });

  it('blocks subject and body output when required fields are missing', () => {
    const result = renderReplyTemplate({
      template: baseTemplate,
      values: {
        aktenzeichen: '',
        name: 'Max Mustermann',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.blockedReason).toBe('missing_required');
    expect(result.subject).toBeNull();
    expect(result.body).toBeNull();
    expect(result.missingRequiredFields).toEqual(['aktenzeichen']);
  });

  it('blocks when body contains an unknown placeholder', () => {
    const result = renderReplyTemplate({
      template: {
        ...baseTemplate,
        body: `${baseTemplate.body}\nReferenz: {{unknown_ref}}`,
      },
      values: {
        aktenzeichen: 'AZ-123',
        name: 'Max Mustermann',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.blockedReason).toBe('unknown_placeholder');
    expect(result.subject).toBeNull();
    expect(result.body).toBeNull();
    expect(result.unknownPlaceholders).toEqual(['unknown_ref']);
  });

  it('blocks when subject contains an unknown placeholder', () => {
    const result = renderReplyTemplate({
      template: {
        ...baseTemplate,
        subjectTemplate: 'Unterlagen zu {{unknown_subject}}',
      },
      values: {
        aktenzeichen: 'AZ-123',
        name: 'Max Mustermann',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.blockedReason).toBe('unknown_placeholder');
    expect(result.subject).toBeNull();
    expect(result.body).toBeNull();
    expect(result.unknownPlaceholders).toEqual(['unknown_subject']);
  });

  it('fails safe on invalid conditional keys', () => {
    const result = renderReplyTemplate({
      template: {
        ...baseTemplate,
        body: 'Test\n{{#if aktenzeichen-invalid}}Aktenzeichen: {{aktenzeichen}}{{/if}}',
      },
      values: {
        aktenzeichen: 'AZ-123',
        name: 'Max Mustermann',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.blockedReason).toBe('invalid_template');
  });

  it('fails safe on nested conditional blocks', () => {
    const result = renderReplyTemplate({
      template: {
        ...baseTemplate,
        body: '{{#if aktenzeichen}}{{#if steuernummer}}X{{/if}}{{/if}}',
      },
      values: {
        aktenzeichen: 'AZ-123',
        steuernummer: '12/345/67890',
        name: 'Max Mustermann',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.blockedReason).toBe('invalid_template');
  });
});

describe('reply template renderer regex guards', () => {
  it('matches only normal field placeholders', () => {
    const matches = Array.from(
      '{{aktenzeichen}} {{#if aktenzeichen}} {{/if}} {{name}}'.matchAll(PLACEHOLDER_REGEX),
    ).map(match => match[1]);

    expect(matches).toEqual(['aktenzeichen', 'name']);
  });

  it('validates conditional field keys with the strict field regex', () => {
    expect(VALID_FIELD_KEY_REGEX.test('aktenzeichen')).toBe(true);
    expect(VALID_FIELD_KEY_REGEX.test('aktenzeichen_invalid')).toBe(true);
    expect(VALID_FIELD_KEY_REGEX.test('aktenzeichen-invalid')).toBe(false);
    expect(VALID_FIELD_KEY_REGEX.test('aktenzeichen.invalid')).toBe(false);
  });
});
