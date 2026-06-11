/**
 * D-3.4a — Plain-text NK letter → minimal A4 HTML for expo-print
 */

export const NK_LETTER_DISCLAIMER_DE =
  'Dieser Entwurf wurde mit BriefPilot als Rechen- und Strukturhilfe erstellt. Er ersetzt keine rechtliche Beratung. Bitte prüfen Sie alle Angaben, Umlageschlüssel, Belege und Fristen vor dem Versand.';

const DISCLAIMER_MARKER = 'Dieser Entwurf wurde mit BriefPilot';

/**
 * Domain letter draft appends the same disclaimer as separate lines; PDF HTML adds it once in the footer.
 */
export function stripNkLetterDisclaimerFromBody(letterPlainText: string): string {
  const idx = letterPlainText.indexOf(DISCLAIMER_MARKER);
  if (idx === -1) return letterPlainText;

  let trimmed = letterPlainText.slice(0, idx).trimEnd();
  if (trimmed.endsWith('---')) {
    trimmed = trimmed.slice(0, -3).trimEnd();
  }
  return trimmed;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildNkLetterHtml(letterPlainText: string): string {
  const body = escapeHtml(stripNkLetterDisclaimerFromBody(letterPlainText));
  const disclaimer = escapeHtml(NK_LETTER_DISCLAIMER_DE);

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nebenkostenabrechnung</title>
  <style>
    @page { size: A4 portrait; margin: 18mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      color: #1a1a2e;
      background: #fff;
      font-size: 13px;
      line-height: 1.6;
      margin: 0;
      padding: 24px;
    }
    .wrap { max-width: 720px; margin: 0 auto; }
    h1 {
      font-size: 20px;
      font-weight: 800;
      margin: 0 0 20px;
      color: #1a1a2e;
    }
    .body {
      white-space: pre-wrap;
      word-break: break-word;
      margin-bottom: 24px;
    }
    .footer {
      border-top: 1px solid #e6e8f0;
      padding-top: 14px;
      font-size: 11px;
      color: #6b7280;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Nebenkostenabrechnung</h1>
    <div class="body">${body}</div>
    <div class="footer">${disclaimer}</div>
  </div>
</body>
</html>`;
}
