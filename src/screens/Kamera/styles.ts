import { StyleSheet, Dimensions } from 'react-native';
import { ACCENT, SUCCESS, DANGER } from './constants';

const { width: SCREEN_W } = Dimensions.get('window');
// A4 frame: 95% screen width, A4 aspect ratio (297/210 ≈ 1.414)
// Portrait FOV physics: min scan distance for full A4 ≈ 39cm; 95% → ~45cm target
const GUIDE_W = Math.round(SCREEN_W * 0.95);
const GUIDE_H = Math.round(GUIDE_W * 1.414);

export const styles = StyleSheet.create({
  fill:         { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center', gap: 16 },

  // Scan line
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: SUCCESS,
    shadowColor: SUCCESS, shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },

  // Top controls
  topBar: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  controlBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(9,12,22,0.52)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  controlBtnActive: { backgroundColor: 'rgba(34,197,94,0.3)', borderColor: SUCCESS },

  // Stability indicator
  stabilityContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 6 },
  stabilityText:      { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  stabilityBarWrap:   { width: 120, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  stabilityBar:       { height: '100%', borderRadius: 2 },

  // Guide frame corners — screen-relative (A4 ratio, 88% screen width → ~25cm hold distance)
  guideFrame: {
    position: 'absolute', top: '10%', alignSelf: 'center', width: GUIDE_W, height: GUIDE_H,
  },
  corner: { position: 'absolute', width: 34, height: 34, borderRadius: 2 },
  cornerTL: { top: 0, left: 0,     borderTopWidth: 2.5, borderLeftWidth: 2.5  },
  cornerTR: { top: 0, right: 0,    borderTopWidth: 2.5, borderRightWidth: 2.5 },
  cornerBL: { bottom: 0, left: 0,  borderBottomWidth: 2.5, borderLeftWidth: 2.5  },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 2.5, borderRightWidth: 2.5 },

  // Filter bar
  filterBar: {
    position: 'absolute', left: 0, right: 0,
    paddingHorizontal: 16,
  },
  filterScrollContent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 16 },
  filterPreviewCard: {
    width: 120,
    height: 156,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  filterPreviewImage: { width: '100%', height: '100%' },
  filterPreviewOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterPreviewLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  filterPreviewValue: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 2 },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'transparent', alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: 'rgba(255,255,255,0.3)', borderColor: '#fff' },
  filterText:      { fontSize: 9, color: '#fff', fontWeight: '600', marginTop: 2 },
  filterApplyBtn: {
    minWidth: 110,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterApplyBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  filterApplyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Edit view
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  editHeaderSpacer: {
    width: 42,
    height: 42,
  },
  editTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  editMetaRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  editMetaCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  editMetaLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600',
  },
  editMetaValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  editBody: {
    flex: 1,
  },
  editPreviewFrame: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  editPreviewImage: {
    width: '100%',
    height: '100%',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  editActionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    gap: 6,
    minHeight: 64,
  },
  editActionBtnActive: {
    backgroundColor: 'rgba(124,110,248,0.28)',
    borderColor: ACCENT,
  },
  editActionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  editSectionTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  editFilterPanel: {
    paddingTop: 16,
  },
  enhancementPanel: {
    paddingTop: 16,
    gap: 14,
  },
  enhancementHero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    padding: 16,
    backgroundColor: 'rgba(124,110,248,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(124,110,248,0.35)',
  },
  enhancementHeroIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  enhancementHeroTextWrap: {
    flex: 1,
  },
  enhancementHeroTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  enhancementHeroText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  enhancementMetrics: {
    flexDirection: 'row',
    gap: 10,
  },
  enhancementMetricCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  enhancementMetricLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600',
  },
  enhancementMetricValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  enhancementPresetRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 16,
  },
  enhancementPresetCard: {
    width: 170,
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  enhancementPresetCardActive: {
    backgroundColor: 'rgba(124,110,248,0.2)',
    borderColor: ACCENT,
  },
  enhancementPresetIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  enhancementPresetTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  enhancementPresetHint: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  enhancementApplyBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  enhancementApplyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 24,
  },
  sideBtn:       { alignItems: 'center', gap: 6, width: 60 },
  sideBtnCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  sideBtnText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  // Shutter
  shutterBtn: {
    width: 76, height: 76, borderRadius: 38, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 0 },
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30 },
  pageCountText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Thumbnail strip
  thumbnailStrip:     { position: 'absolute', left: 0, right: 0, height: 100, paddingVertical: 10 },
  thumbnailContainer: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  thumbnailWrapper:   { width: 70, height: 90, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: ACCENT },
  thumbnailImage:     { width: '100%', height: '100%' },
  thumbnailBadge:     { position: 'absolute', top: 4, left: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  thumbnailBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  thumbnailDelete:    { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(239,68,68,0.8)', alignItems: 'center', justifyContent: 'center' },

  // Batch view
  batchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  batchTitle:  { color: '#fff', fontSize: 17, fontWeight: '600' },
  clearText:   { color: DANGER, fontSize: 14 },
  batchList:   { padding: 16, gap: 12 },
  batchPage:   { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 12, gap: 12, alignItems: 'center' },
  batchPageImage:   { width: 80, height: 110, borderRadius: 8 },
  batchPageInfo:    { flex: 1, justifyContent: 'center' },
  batchPageTitle:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  batchPageFilter:  { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  batchPageActions: { flexDirection: 'row', gap: 12 },
  batchFooter:      { padding: 16, gap: 12 },

  // Buttons
  primaryBtn:     { borderRadius: 16, padding: 16, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryBtn:   { borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  secondaryBtnText: { fontSize: 14, color: '#fff' },

  // Processing view
  processingTitle:    { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 20 },
  processingSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },

  // Permission view
  errorText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
});
