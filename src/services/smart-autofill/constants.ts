import type { ExtractedFields } from './types';

export const FIELD_META: Record<keyof ExtractedFields, { label: string; icon: string; erforderlich: boolean; editierbar: boolean }> = {
  titel:         { label: 'Titel',          icon: '📄', erforderlich: true,  editierbar: true  },
  typ:           { label: 'Dokumenttyp',    icon: '🏷',  erforderlich: true,  editierbar: true  },
  absender:      { label: 'Absender',       icon: '👤', erforderlich: true,  editierbar: true  },
  betrag:        { label: 'Betrag (€)',     icon: '💶', erforderlich: false, editierbar: true  },
  frist:         { label: 'Frist / Datum',  icon: '📅', erforderlich: false, editierbar: true  },
  iban:          { label: 'IBAN',           icon: '🏦', erforderlich: false, editierbar: true  },
  aktenzeichen:  { label: 'Aktenzeichen',  icon: '📎', erforderlich: false, editierbar: true  },
  kundennr:      { label: 'Kundennummer',   icon: '🔖', erforderlich: false, editierbar: true  },
  rechnungsnr:   { label: 'Rechnungsnr.',   icon: '', erforderlich: false, editierbar: true  },
  vertragsnr:    { label: 'Vertragsnr.',    icon: '📝', erforderlich: false, editierbar: true  },
  zahlungszweck: { label: 'Verwendungszweck', icon: '💬', erforderlich: false, editierbar: true },
  steuerid:      { label: 'Steuernummer',   icon: '📊', erforderlich: false, editierbar: true  },
  risiko:        { label: 'Risikostufe',    icon: '🎯', erforderlich: true,  editierbar: true  },
  aktionen:      { label: 'Aktionen',       icon: '⚡', erforderlich: false, editierbar: false },
};

export const PFLICHT_FELDER: Record<string, (keyof ExtractedFields)[]> = {
  Rechnung:        ['typ', 'absender', 'betrag', 'frist'],
  Mahnung:         ['typ', 'absender', 'betrag', 'frist'],
  Bußgeld:         ['typ', 'absender', 'betrag', 'frist'],
  Steuerbescheid:  ['typ', 'absender', 'betrag'],
  Kündigung:       ['typ', 'absender', 'frist'],
  Termin:          ['typ', 'absender', 'frist'],
  Versicherung:    ['typ', 'absender'],
  Vertrag:         ['typ', 'absender'],
  Behördenbescheid:['typ', 'absender'],
  Sonstiges:       ['typ', 'absender'],
};
