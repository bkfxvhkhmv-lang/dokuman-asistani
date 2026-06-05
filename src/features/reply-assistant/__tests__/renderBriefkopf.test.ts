import { renderBriefkopf } from '../domain/renderBriefkopf';

describe('renderBriefkopf', () => {
  const base = {
    senderName: 'Max Mustermann',
    senderAdresse: 'Musterstraße 1, 12345 Berlin',
    empfaengerStelle: 'Bußgeldstelle der Stadt Berlin',
    datum: '05.06.2026',
  };

  it('produces correct structure with all required fields', () => {
    const result = renderBriefkopf(base);
    expect(result).toBe(
      'Max Mustermann\n' +
      'Musterstraße 1, 12345 Berlin\n' +
      '\n' +
      'Bußgeldstelle der Stadt Berlin\n' +
      '\n' +
      '05.06.2026\n' +
      '\n',
    );
  });

  it('appends empfaengerAdresse when provided', () => {
    const result = renderBriefkopf({ ...base, empfaengerAdresse: 'Alexanderplatz 1, 10178 Berlin' });
    expect(result).toContain('Bußgeldstelle der Stadt Berlin\nAlexanderplatz 1, 10178 Berlin\n');
  });

  it('omits empfaengerAdresse line when undefined', () => {
    const result = renderBriefkopf(base);
    const lines = result.split('\n');
    // Only one line for the empfaenger (no address line after it)
    const stelleIdx = lines.indexOf('Bußgeldstelle der Stadt Berlin');
    expect(lines[stelleIdx + 1]).toBe('');
  });

  it('ends with double blank line so copy output reads Datum + blank + Betreff', () => {
    const result = renderBriefkopf(base);
    expect(result.endsWith('05.06.2026\n\n')).toBe(true);
  });

  it('does not compute date internally — datum is exactly what was passed', () => {
    const result = renderBriefkopf({ ...base, datum: '01.01.2099' });
    expect(result).toContain('01.01.2099');
    expect(result).not.toContain('2026');
  });
});
