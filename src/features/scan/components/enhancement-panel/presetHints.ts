/** Kurz-Hinweise auf den Preset-Karten (id → Text). */
export function getPresetSubtitle(presetId: string): string {
  switch (presetId) {
    case 'original':
      return 'Unverändert';
    case 'clean':
      return 'Helle Kanten';
    case 'magic':
      return 'Dokument-Look';
    case 'bw':
      return 'Maximale Lesbarkeit';
    default:
      return 'Details + Kontrast';
  }
}
