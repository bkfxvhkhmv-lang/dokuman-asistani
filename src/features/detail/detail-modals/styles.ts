import { StyleSheet } from 'react-native';

export const detailModalStyles = StyleSheet.create({
  sheetButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 14,
  },
  infoRow:     { gap: 4 },
  infoLabel:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  infoValue:   { fontSize: 15, fontWeight: '700' },
  infoDivider: { height: 0.5, marginVertical: 12 },
});
