import { StyleSheet } from 'react-native';
import { SHEET_CYAN, SHEET_NAVY } from '@/features/scan/components/post-capture-sheet/constants';

export const postCaptureSheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: SHEET_NAVY,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    borderTopWidth:  1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginTop: 14, marginBottom: 0,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  title: {
    color: '#FFFFFF', fontSize: 26, fontWeight: '900', letterSpacing: 1.4,
  },

  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 16, marginBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  insightDot: {
    width: 8, height: 8, borderRadius: 4,
    marginTop: 4, flexShrink: 0,
  },
  insightText: {
    flex: 1, color: 'rgba(255,255,255,0.55)',
    fontSize: 12, lineHeight: 18,
  },

  primaryWrap: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  primaryGlow: {
    position: 'absolute',
    top: -8, bottom: -8, left: -8, right: -8,
    borderRadius: 30,
    backgroundColor: SHEET_CYAN + '16',
    borderWidth: 1, borderColor: SHEET_CYAN + '28',
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#0F1E2E',
    borderRadius: 20, padding: 16,
    borderWidth: 1.5, borderColor: SHEET_CYAN + '55',
    shadowColor: SHEET_CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.30,
    shadowRadius: 18,
    elevation: 14,
  },
  primaryIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: SHEET_CYAN + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  primaryLabel: {
    color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: -0.3,
  },
  primarySub: {
    color: SHEET_CYAN + 'AA', fontSize: 11, marginTop: 2, letterSpacing: 0.1,
  },

  grid: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  gridIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  gridLabel: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600',
  },

  cancelBtn: {
    marginHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  cancelText: { color: 'rgba(255,255,255,0.30)', fontSize: 13, fontWeight: '600' },
});
