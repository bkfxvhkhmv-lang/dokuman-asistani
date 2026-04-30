import { StyleSheet } from 'react-native';

export const highlightedTextStyles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 10, fontWeight: '700' as const },
  chipUnderline: { position: 'absolute', bottom: 0, left: 0, height: 1.5, borderRadius: 1 },
  scanEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    opacity: 0.85,
  },
});
