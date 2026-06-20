import { computeEditDirty, EMPTY_EDIT_SNAPSHOT, type EditSnapshot } from '@/features/detail/modals/editDirtyCheck';

function snap(overrides: Partial<EditSnapshot> = {}): EditSnapshot {
  return { ...EMPTY_EDIT_SNAPSHOT, ...overrides };
}

describe('computeEditDirty', () => {
  describe('open modal → close without edits → not dirty', () => {
    it('identical snapshots are not dirty', () => {
      const s = snap({ titel: 'Rechnung', absender: 'Telekom', typ: 'Rechnungen', risiko: 'niedrig' });
      expect(computeEditDirty(s, s)).toBe(false);
    });

    it('both empty → not dirty', () => {
      expect(computeEditDirty(EMPTY_EDIT_SNAPSHOT, EMPTY_EDIT_SNAPSHOT)).toBe(false);
    });

    it('hydrated values match snapshot → not dirty', () => {
      const initial = snap({ titel: 'Mahnung', absender: 'Finanzamt', betrag: '250,00', risiko: 'mittel', typ: 'Behörden / Amt' });
      const current = snap({ titel: 'Mahnung', absender: 'Finanzamt', betrag: '250,00', risiko: 'mittel', typ: 'Behörden / Amt' });
      expect(computeEditDirty(current, initial)).toBe(false);
    });
  });

  describe('display vs stored format — not dirty when semantically equal', () => {
    it('German date vs ISO date → not dirty', () => {
      const initial = snap({ frist: '01.06.2026' });
      const current = snap({ frist: '2026-06-01' });
      expect(computeEditDirty(current, initial)).toBe(false);
    });

    it('comma vs dot betrag → not dirty', () => {
      const initial = snap({ betrag: '99,36' });
      const current = snap({ betrag: '99.36' });
      expect(computeEditDirty(current, initial)).toBe(false);
    });
  });

  describe('user edits → dirty', () => {
    it('changed titel → dirty', () => {
      const initial = snap({ titel: 'Rechnung' });
      const current = snap({ titel: 'Bearbeitete Rechnung' });
      expect(computeEditDirty(current, initial)).toBe(true);
    });

    it('changed absender → dirty', () => {
      const initial = snap({ absender: 'Telekom' });
      const current = snap({ absender: 'Vodafone' });
      expect(computeEditDirty(current, initial)).toBe(true);
    });

    it('changed betrag → dirty', () => {
      const initial = snap({ betrag: '100,00' });
      const current = snap({ betrag: '200,00' });
      expect(computeEditDirty(current, initial)).toBe(true);
    });

    it('changed frist → dirty', () => {
      const initial = snap({ frist: '01.06.2026' });
      const current = snap({ frist: '01.07.2026' });
      expect(computeEditDirty(current, initial)).toBe(true);
    });

    it('changed typ → dirty', () => {
      const initial = snap({ typ: 'Sonstiges' });
      const current = snap({ typ: 'Rechnungen' });
      expect(computeEditDirty(current, initial)).toBe(true);
    });

    it('changed risiko → dirty', () => {
      const initial = snap({ risiko: 'niedrig' });
      const current = snap({ risiko: 'hoch' });
      expect(computeEditDirty(current, initial)).toBe(true);
    });

    it('changed profilId → dirty', () => {
      const initial = snap({ profilId: null });
      const current = snap({ profilId: 'profile-1' });
      expect(computeEditDirty(current, initial)).toBe(true);
    });
  });

  describe('normalization — hydrated null/undefined/empty do not trigger dirty', () => {
    it('null vs empty string → not dirty', () => {
      const initial = snap({ iban: '' });
      const current = snap({ iban: '' });
      expect(computeEditDirty(current, initial)).toBe(false);
    });

    it('whitespace-only vs empty → not dirty (trim normalization)', () => {
      const initial = snap({ titel: 'Rechnung' });
      const current = snap({ titel: 'Rechnung' });
      expect(computeEditDirty(current, initial)).toBe(false);
    });

    it('trailing whitespace on both sides → not dirty', () => {
      const initial = snap({ absender: 'Telekom  ' });
      const current = snap({ absender: 'Telekom' });
      expect(computeEditDirty(current, initial)).toBe(false);
    });

    it('leading whitespace on one side → not dirty', () => {
      const initial = snap({ titel: '  Mahnung' });
      const current = snap({ titel: 'Mahnung' });
      expect(computeEditDirty(current, initial)).toBe(false);
    });

    it('undefined fields normalize to empty → not dirty', () => {
      const initial = snap({ zahlungszweck: '' });
      const current = snap({ zahlungszweck: undefined as unknown as string });
      expect(computeEditDirty(current, initial)).toBe(false);
    });
  });

  describe('profilId — strict comparison (not trimmed)', () => {
    it('null vs null → not dirty', () => {
      expect(computeEditDirty(snap({ profilId: null }), snap({ profilId: null }))).toBe(false);
    });

    it('profile-1 vs null → dirty', () => {
      expect(computeEditDirty(snap({ profilId: 'profile-1' }), snap({ profilId: null }))).toBe(true);
    });

    it('same profilId → not dirty', () => {
      expect(computeEditDirty(snap({ profilId: 'p-42' }), snap({ profilId: 'p-42' }))).toBe(false);
    });
  });
});
