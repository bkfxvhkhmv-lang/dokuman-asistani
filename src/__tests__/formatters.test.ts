import {
  getTageVerbleibend,
  getTageText,
  formatBetrag,
  formatDatum,
  generateId,
} from '../utils/formatters';

describe('generateId', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateId()).toBe('string');
    expect(generateId().length).toBeGreaterThan(0);
  });

  it('returns unique values each call', () => {
    const ids = Array.from({ length: 50 }, generateId);
    expect(new Set(ids).size).toBe(50);
  });
});

describe('getTageVerbleibend', () => {
  it('returns null for null input', () => {
    expect(getTageVerbleibend(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getTageVerbleibend(undefined)).toBeNull();
  });

  it('returns a negative number for a past date', () => {
    const yesterday = new Date(Date.now() - 86400000 * 2).toISOString();
    const result = getTageVerbleibend(yesterday);
    expect(result).not.toBeNull();
    expect(result!).toBeLessThan(0);
  });

  it('returns a positive number for a future date', () => {
    const nextWeek = new Date(Date.now() + 86400000 * 7).toISOString();
    const result = getTageVerbleibend(nextWeek);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });

  it('returns approximately 7 for one week from now', () => {
    const in7Days = new Date(Date.now() + 86400000 * 7).toISOString();
    const result = getTageVerbleibend(in7Days);
    expect(result).toBe(7);
  });
});

describe('getTageText', () => {
  it('returns null for null input', () => {
    expect(getTageText(null)).toBeNull();
  });

  it('returns "Überfällig!" for past dates', () => {
    const past = new Date(Date.now() - 86400000 * 5).toISOString();
    expect(getTageText(past)).toBe('Überfällig!');
  });

  it('returns a non-null string for a date within 24h', () => {
    const soonish = new Date(Date.now() + 3600000 * 4).toISOString();
    const result = getTageText(soonish);
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });

  it('returns "Morgen fällig" for 1 day remaining', () => {
    const in1Day = new Date(Date.now() + 86400000).toISOString();
    const result = getTageText(in1Day);
    expect(result).toBe('Morgen fällig');
  });

  it('returns "Noch X Tage" for 2-3 days', () => {
    const in3Days = new Date(Date.now() + 86400000 * 3).toISOString();
    const result = getTageText(in3Days);
    expect(result).toBe('Noch 3 Tage');
  });

  it('returns "X Tage" for > 3 days', () => {
    const in10Days = new Date(Date.now() + 86400000 * 10).toISOString();
    const result = getTageText(in10Days);
    expect(result).toBe('10 Tage');
  });
});

describe('formatBetrag', () => {
  it('returns null for null input', () => {
    expect(formatBetrag(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatBetrag(undefined)).toBeNull();
  });

  it('formats a number with 2 decimal places and € symbol', () => {
    expect(formatBetrag(123.45)).toBe('123,45 €');
  });

  it('formats a string number', () => {
    expect(formatBetrag('99.9')).toBe('99,90 €');
  });

  it('returns null for non-numeric string', () => {
    expect(formatBetrag('abc')).toBeNull();
  });

  it('uses custom currency symbol', () => {
    expect(formatBetrag(50, '$')).toBe('50,00 $');
  });

  it('formats zero correctly', () => {
    expect(formatBetrag(0)).toBe('0,00 €');
  });
});

describe('formatDatum', () => {
  it('returns empty string for null', () => {
    expect(formatDatum(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDatum(undefined)).toBe('');
  });

  it('returns a non-empty string for a valid date', () => {
    const result = formatDatum('2025-06-15');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('2025');
  });
});
