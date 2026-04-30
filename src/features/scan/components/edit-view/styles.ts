import { StyleSheet } from 'react-native';
import { BG_DARK, ACCENT } from '@/features/scan/constants';

export const editViewStyles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },

  preview: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: BG_DARK,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },

  rotateOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    pointerEvents: 'none',
  },
  rotateIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)',
  },

  compareBar: {
    paddingTop: 10,
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: 'rgba(10,11,20,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  compareToggleRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  toggleChipActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  toggleChipOptimized: {
    backgroundColor: `${ACCENT}33`,
    borderColor: ACCENT,
  },
  toggleChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  optimizeHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  compareActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  revertBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
  },
  revertText: { fontSize: 14, fontWeight: '700', color: '#F87171' },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#22C55E',
  },
  acceptText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
