/**
 * D-3.4a — NK letter HTML adapter tests
 */

import {
  NK_LETTER_DISCLAIMER_DE,
  buildNkLetterHtml,
  escapeHtml,
} from '@/features/vermieter/nebenkosten/export/letterHtml';

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

  it('does not include legal certainty wording', () => {
    const html = buildNkLetterHtml('Test');
    expect(html).not.toMatch(/rechtsverbindlich|garantiert|anerkannt von/i);
  });

  it('uses German lang attribute', () => {
    expect(buildNkLetterHtml('x')).toContain('<html lang="de">');
  });
});
