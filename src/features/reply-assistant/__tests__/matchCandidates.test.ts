import { getAllReplyTemplates } from '@/features/reply-assistant/templates/selectors';
import {
  getReplyTemplateCandidates,
} from '@/features/reply-assistant/templates/matchCandidates';

const registryIds = new Set(getAllReplyTemplates().map(t => t.id));

describe('getReplyTemplateCandidates', () => {
  describe('unknown / empty input', () => {
    it('returns none for empty input', () => {
      const r = getReplyTemplateCandidates({});
      expect(r.reason).toBe('none');
      expect(r.candidates).toHaveLength(0);
    });

    it('returns none for unknown category', () => {
      const r = getReplyTemplateCandidates({ category: 'unknown_xyz' });
      expect(r.reason).toBe('none');
      expect(r.candidates).toHaveLength(0);
    });
  });

  describe('all returned templates are real registry entries', () => {
    const categories = ['bussgeld', 'jobcenter', 'finanzamt', 'miete', 'schufa', 'inkasso'];
    for (const category of categories) {
      it(`${category}: all candidates exist in registry`, () => {
        const { candidates } = getReplyTemplateCandidates({ category });
        candidates.forEach(t => {
          expect(registryIds.has(t.id)).toBe(true);
        });
      });
    }
  });

  describe('no duplicates in results', () => {
    it('bussgeld with parking signal has no duplicate IDs', () => {
      const { candidates } = getReplyTemplateCandidates({
        category: 'bussgeld',
        actionType: 'dispute',
      });
      const ids = candidates.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('bussgeld', () => {
    it('returns category candidates without parking signal', () => {
      const { candidates, reason } = getReplyTemplateCandidates({ category: 'bussgeld' });
      const ids = candidates.map(t => t.id);
      expect(reason).toBe('category');
      expect(ids).toContain('bussgeld_akten_einsicht_009');
      expect(ids).toContain('bussgeld_fristverlaengerung_010');
      expect(ids).toContain('bussgeld_general_einspruch_005');
      expect(ids).not.toContain('bussgeld_parking_einspruch_003');
    });

    it('includes parking template when actionType is dispute', () => {
      const { candidates, reason } = getReplyTemplateCandidates({
        category: 'bussgeld',
        actionType: 'dispute',
      });
      const ids = candidates.map(t => t.id);
      expect(reason).toBe('exact');
      expect(ids).toContain('bussgeld_parking_einspruch_003');
    });

    it('includes parking template when documentType is parking', () => {
      const ids = getReplyTemplateCandidates({
        category: 'bussgeld',
        documentType: 'parking',
      }).candidates.map(t => t.id);
      expect(ids).toContain('bussgeld_parking_einspruch_003');
    });
  });

  describe('jobcenter', () => {
    it('returns safe procedural defaults without vorschuss signal', () => {
      const { candidates, reason } = getReplyTemplateCandidates({ category: 'jobcenter' });
      const ids = candidates.map(t => t.id);
      expect(reason).toBe('category');
      expect(ids).toContain('jobcenter_unterlagen_nachreichung_004');
      expect(ids).toContain('jobcenter_fristverlaengerung_005');
      expect(ids).not.toContain('jobcenter_antrag_vorschuss_006');
    });

    it('includes vorschuss template for antrag signal', () => {
      const ids = getReplyTemplateCandidates({
        category: 'jobcenter',
        actionType: 'antrag',
      }).candidates.map(t => t.id);
      expect(ids).toContain('jobcenter_antrag_vorschuss_006');
    });

    it('includes vorschuss template for vorschuss documentType', () => {
      const ids = getReplyTemplateCandidates({
        category: 'jobcenter',
        documentType: 'vorschuss',
      }).candidates.map(t => t.id);
      expect(ids).toContain('jobcenter_antrag_vorschuss_006');
    });
  });

  describe('finanzamt', () => {
    it('returns safe procedural defaults without ratenzahlung signal', () => {
      const { candidates, reason } = getReplyTemplateCandidates({ category: 'finanzamt' });
      const ids = candidates.map(t => t.id);
      expect(reason).toBe('category');
      expect(ids).toContain('finanzamt_fristverlaengerung_003');
      expect(ids).toContain('finanzamt_akteneinsicht_007');
      expect(ids).not.toContain('finanzamt_ratenzahlung_005');
    });

    it('includes ratenzahlung template for ratenzahlung documentType', () => {
      const ids = getReplyTemplateCandidates({
        category: 'finanzamt',
        documentType: 'ratenzahlung',
      }).candidates.map(t => t.id);
      expect(ids).toContain('finanzamt_ratenzahlung_005');
    });

    it('includes ratenzahlung template for stundung signal', () => {
      const ids = getReplyTemplateCandidates({
        category: 'finanzamt',
        documentType: 'stundung',
      }).candidates.map(t => t.id);
      expect(ids).toContain('finanzamt_ratenzahlung_005');
    });
  });

  describe('miete', () => {
    it('returns safe defaults without reparatur signal', () => {
      const { candidates, reason } = getReplyTemplateCandidates({ category: 'miete' });
      const ids = candidates.map(t => t.id);
      expect(reason).toBe('category');
      expect(ids).toContain('miete_mangel_anzeige_004');
      expect(ids).toContain('miete_belegeinsicht_002');
      expect(ids).not.toContain('miete_reparatur_fristsetzung_005');
    });

    it('includes fristsetzung template for demand actionType', () => {
      const ids = getReplyTemplateCandidates({
        category: 'miete',
        actionType: 'demand',
      }).candidates.map(t => t.id);
      expect(ids).toContain('miete_reparatur_fristsetzung_005');
    });
  });

  describe('inkasso', () => {
    it('returns none without payment signal (high-risk default protection)', () => {
      const { candidates } = getReplyTemplateCandidates({ category: 'inkasso' });
      expect(candidates).toHaveLength(0);
    });

    it('returns zahlung nachweis for submit actionType', () => {
      const { candidates } = getReplyTemplateCandidates({
        category: 'inkasso',
        actionType: 'submit',
      });
      const ids = candidates.map(t => t.id);
      expect(ids).toContain('inkasso_zahlung_nachweis_003');
    });

    it('returns zahlung nachweis for zahlungsnachweis documentType', () => {
      const ids = getReplyTemplateCandidates({
        category: 'inkasso',
        documentType: 'zahlungsnachweis',
      }).candidates.map(t => t.id);
      expect(ids).toContain('inkasso_zahlung_nachweis_003');
    });
  });

  describe('schufa', () => {
    it('returns selbstauskunft for schufa category', () => {
      const { candidates, reason } = getReplyTemplateCandidates({ category: 'schufa' });
      expect(reason).toBe('category');
      expect(candidates).toHaveLength(1);
      expect(candidates[0].id).toBe('schufa_selbstauskunft_001');
    });
  });

  describe('ordering stability', () => {
    it('same input returns same order twice', () => {
      const input = { category: 'bussgeld', actionType: 'dispute' };
      const first = getReplyTemplateCandidates(input).candidates.map(t => t.id);
      const second = getReplyTemplateCandidates(input).candidates.map(t => t.id);
      expect(first).toEqual(second);
    });
  });
});
