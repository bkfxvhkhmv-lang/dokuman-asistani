/**
 * D-3.4a — NK letter HTML adapter tests
 */

import {
  NK_LETTER_DISCLAIMER_DE,
  buildNkLetterHtml,
  escapeHtml,
  stripNkLetterDisclaimerFromBody,
} from '@/features/vermieter/nebenkosten/export/letterHtml';

const DOMAIN_LETTER_WITH_DISCLAIMER = [
  'Vermieter GmbH',
  'Musterstraße 1',
  '12345 Berlin',
  '',
  'Mieter Name',
  '',
  'Nebenkostenabrechnung 2024',
  'KOSTENPOSITIONEN',
  '---',
  'Dieser Entwurf wurde mit BriefPilot als Rechen- und Strukturhilfe erstellt.',
  'Er ersetzt keine rechtliche Beratung.',
  'Bitte prüfen Sie alle Angaben, Umlageschlüssel, Belege und Fristen vor dem Versand.',
].join('\n');

describe('escapeHtml', () => {
  it('escapes special HTML characters', () => {
    expect(escapeHtml(`A & B <tag> "quote" 'apos'`)).toBe(
      'A &amp; B &lt;tag&gt; &quot;quote&quot; &#39;apos&#39;',
    );
  });
});

describe('buildNkLetterHtml', () => {
  it('includes Nebenkostenabrechnung title', () => {
    const html = buildNkLetterHtml('Zeile 1');
    expect(html).toContain('<h1>Nebenkostenabrechnung</h1>');
    expect(html).toContain('<title>Nebenkostenabrechnung</title>');
  });

  it('preserves line breaks via pre-wrap body', () => {
    const html = buildNkLetterHtml('Erste Zeile\nZweite Zeile');
    expect(html).toContain('white-space: pre-wrap');
    expect(html).toContain('Erste Zeile\nZweite Zeile');
  });

  it('escapes HTML in letter body', () => {
    const html = buildNkLetterHtml('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('includes fixed disclaimer in footer', () => {
    const html = buildNkLetterHtml('Inhalt');
    expect(html).toContain(NK_LETTER_DISCLAIMER_DE);
    expect(html).toContain('class="footer"');
  });

  it('includes disclaimer exactly once when domain letter already contains it', () => {
    const html = buildNkLetterHtml(DOMAIN_LETTER_WITH_DISCLAIMER);
    const matches = html.match(/Dieser Entwurf wurde mit BriefPilot/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(html).toContain('class="footer"');
    expect(html).not.toContain('---');
  });

  it('stripNkLetterDisclaimerFromBody removes trailing disclaimer block', () => {
    const stripped = stripNkLetterDisclaimerFromBody(DOMAIN_LETTER_WITH_DISCLAIMER);
    expect(stripped).not.toContain('Dieser Entwurf wurde mit BriefPilot');
    expect(stripped).toContain('KOSTENPOSITIONEN');
    expect(stripped).not.toContain('---');
  });

  it('does not include legal certainty wording', () => {
    const html = buildNkLetterHtml('Test');
    expect(html).not.toMatch(/rechtsverbindlich|garantiert|anerkannt von/i);
  });

  it('uses German lang attribute', () => {
    expect(buildNkLetterHtml('x')).toContain('<html lang="de">');
  });
});
