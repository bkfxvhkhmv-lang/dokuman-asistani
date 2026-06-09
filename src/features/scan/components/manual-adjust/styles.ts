/**
 * Manual Adjust sheet'inin tum stilleri.
 *
 * Tek dosyada toplandi:
 *  - Renk degisiklikleri tek yerden yapilabilsin
 *  - Sub-component'ler arasinda paylasilan stil bicimleri
 *    (preview, zoom button group, slider track) ayni source-of-truth'tan
 *    gelsin.
 */
import { StyleSheet } from 'react-native';
import { ACCENT, BG_DARK } from '@/features/scan/constants';

export const adjustStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_DARK },

  /* ── Floating close button (top-left) ─────────────────────────────── */
  floatingCloseBtn: {
    position: 'absolute',
    left: 12,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },

  /* ── Preview area ─────────────────────────────────────────────────── */
  previewArea: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
    position: 'relative',
  },
  previewBox: { flex: 1 },
  previewImage: { width: '100%', height: '100%' },
  previewPlaceholder: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0a0b14' },

  compareBadge: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(248,113,113,0.85)',
  },
  compareBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },

  compareBtn: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  compareBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  zoomBtnGroup: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'column',
    gap: 6,
  },
  zoomBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewBusy: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  /* ── Controls block ───────────────────────────────────────────────── */
  controlsBlock: {
    backgroundColor: BG_DARK,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
  },

  presetsRow: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 2, gap: 6 },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  presetChipActive: {
    backgroundColor: `${ACCENT}33`,
    borderColor: ACCENT,
  },
  presetChipText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  presetChipTextActive: { color: '#fff' },

  /* ── Sliders ──────────────────────────────────────────────────────── */
  slidersBlock: { maxHeight: 160 },
  slidersInner: {
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 4,
  },

  sliderRow: { marginBottom: 5 },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sliderLabel: { color: '#aaa', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  sliderValue: { color: '#666', fontSize: 10, fontWeight: '700', minWidth: 32, textAlign: 'right' },
  sliderValueActive: { color: '#fff' },

  sliderTrackArea: { height: 36, justifyContent: 'center' },
  sliderTrackBg: {
    height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  sliderFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#4FC3F7',
  },
  sliderCenterMark: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 2,
    height: 8,
    marginLeft: -1,
    marginTop: -4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  sliderThumb: {
    position: 'absolute',
    width: 16, height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginLeft: -8,
    top: '50%', marginTop: -8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 3,
    elevation: 4,
  },

  /* ── Footer ───────────────────────────────────────────────────────── */
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  applyBtn: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  applyBtnDisabled: { opacity: 0.6 },
  applyText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
