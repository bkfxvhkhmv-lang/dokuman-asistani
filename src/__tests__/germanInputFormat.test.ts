import {
  GERMAN_DATE_PLACEHOLDER,
  formatAmountForEditInput,
  formatIsoToGermanDate,
  normalizeAmountForCompare,
  normalizeDateForCompare,
  parseAmountForStore,
  parseGermanDateInput,
} from '@/utils/germanInputFormat';
import { formatBetrag } from '@/utils/formatters';

describe('germanInputFormat', () => {
  describe('formatIsoToGermanDate', () => {
    it('converts ISO prefix to DD.MM.YYYY', () => {
      expect(formatIsoToGermanDate('2026-04-30T00:00:00.000Z')).toBe('30.04.2026');
      expect(formatIsoToGermanDate('2026-04-30')).toBe('30.04.2026');
    });

    it('returns empty for null/empty', () => {
      expect(formatIsoToGermanDate(null)).toBe('');
      expect(formatIsoToGermanDate('')).toBe('');
    });
  });

  describe('parseGermanDateInput', () => {
    it('parses DD.MM.YYYY to YYYY-MM-DD', () => {
      expect(parseGermanDateInput('30.04.2026')).toBe('2026-04-30');
    });

    it('accepts YYYY-MM-DD unchanged', () => {
      expect(parseGermanDateInput('2026-05-01')).toBe('2026-05-01');
    });

    it('returns null for invalid input', () => {
      expect(parseGermanDateInput('')).toBeNull();
      expect(parseGermanDateInput('32.13.2026')).toBeNull();
      expect(parseGermanDateInput('not-a-date')).toBeNull();
    });
  });

  describe('normalizeDateForCompare', () => {
    it('treats ISO and German display as equal', () => {
      expect(normalizeDateForCompare('2026-06-01')).toBe(normalizeDateForCompare('01.06.2026'));
    });
  });

  describe('formatAmountForEditInput / parseAmountForStore', () => {
    it('formats amount with comma decimal', () => {
      expect(formatAmountForEditInput(99.36)).toBe('99,36');
    });

    it('parses German amount to number', () => {
      expect(parseAmountForStore('99,36')).toBe(99.36);
      expect(parseAmountForStore('1.234,56')).toBe(1234.56);
    });

    it('normalizeAmountForCompare equates comma and dot forms', () => {
      expect(normalizeAmountForCompare('99,36')).toBe(normalizeAmountForCompare('99.36'));
    });
  });

  describe('GERMAN_DATE_PLACEHOLDER', () => {
    it('is not ISO format', () => {
      expect(GERMAN_DATE_PLACEHOLDER).toBe('TT.MM.JJJJ');
      expect(GERMAN_DATE_PLACEHOLDER).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatBetrag display', () => {
    it('shows German currency format', () => {
      expect(formatBetrag(99.36)).toBe('99,36 €');
    });
  });
});
