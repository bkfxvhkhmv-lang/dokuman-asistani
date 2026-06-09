import {
  getAllReplyTemplates,
  getReplyTemplateById,
  getReplyTemplatesByCategory,
  hasReplyTemplate,
} from '@/features/reply-assistant/templates/selectors';

describe('template selectors', () => {
  describe('getAllReplyTemplates', () => {
    it('returns exactly 20 templates', () => {
      expect(getAllReplyTemplates()).toHaveLength(20);
    });

    it('returned array mutation does not affect registry', () => {
      const all = getAllReplyTemplates() as unknown as unknown[];
      // getAllReplyTemplates returns readonly — cast to verify runtime immutability
      expect(() => {
        (all as unknown[]).push({ id: 'injected' });
      }).toThrow();
    });

    it('all IDs are unique', () => {
      const ids = getAllReplyTemplates().map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getReplyTemplateById', () => {
    it('returns the expected template for a known id', () => {
      const t = getReplyTemplateById('bussgeld_akten_einsicht_009');
      expect(t).toBeDefined();
      expect(t?.id).toBe('bussgeld_akten_einsicht_009');
    });

    it('returns undefined for an unknown id', () => {
      expect(getReplyTemplateById('does_not_exist_999')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(getReplyTemplateById('')).toBeUndefined();
    });
  });

  describe('hasReplyTemplate', () => {
    it('returns true for a known id', () => {
      expect(hasReplyTemplate('schufa_selbstauskunft_001')).toBe(true);
    });

    it('returns false for an unknown id', () => {
      expect(hasReplyTemplate('unknown_template_xyz')).toBe(false);
    });
  });

  describe('getReplyTemplatesByCategory', () => {
    it('returns all templates in a known category', () => {
      const results = getReplyTemplatesByCategory('bussgeld');
      expect(results.length).toBeGreaterThan(0);
      results.forEach(t => expect(t.category).toBe('bussgeld'));
    });

    it('returns empty array for unknown category', () => {
      expect(getReplyTemplatesByCategory('unknown_category_xyz')).toEqual([]);
    });

    it('returns only matching category templates (finanzamt)', () => {
      const results = getReplyTemplatesByCategory('finanzamt');
      expect(results.length).toBe(4);
      results.forEach(t => expect(t.category).toBe('finanzamt'));
    });

    it('returns only matching category templates (miete)', () => {
      const results = getReplyTemplatesByCategory('miete');
      expect(results.length).toBeGreaterThan(0);
      results.forEach(t => expect(t.category).toBe('miete'));
    });
  });
});
