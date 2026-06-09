/**
 * Batch view alt bilesenlerinin ortak stilleri.
 * Tek dosyada toplandi cunku:
 *  - Sub-component'ler arasinda paylasilan bircok stil var
 *    (qualityDot, thumbBadge vs.)
 *  - Renk/spacing degisiklikleri tek yerden yapilabilsin
 */
import { StyleSheet } from 'react-native';
import { ACCENT, DANGER } from '@/features/scan/constants';

export const batchStyles = StyleSheet.create({
  /* --- Header --- */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 6 },

  /* --- Stats bar --- */
  statsBar: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 16, paddingBottom: 10,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { color: '#aaa', fontSize: 12, fontWeight: '600' },

  /* --- List + Page row --- */
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },

  pageCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  pageCardSelected: {
    borderColor: ACCENT,
    backgroundColor: `${ACCENT}18`,
  },

  selectCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  selectCircleActive: {
    backgroundColor: ACCENT, borderColor: ACCENT,
  },

  thumbWrap: { width: 72, height: 96, borderRadius: 10, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  thumbBadge: {
    position: 'absolute', top: 5, left: 5,
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  thumbBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  enhancedBadge: {
    position: 'absolute', bottom: 5, right: 5,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(124,110,248,0.85)', alignItems: 'center', justifyContent: 'center',
  },

  pageInfo: { flex: 1, gap: 4 },
  pageTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* --- Quality indicators --- */
  qualityDot: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  qualityDotCircle: { width: 7, height: 7, borderRadius: 4 },
  qualityDotLabel: { fontSize: 11, fontWeight: '600' },

  qualityStrip: {
    height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  qualityStripFill: { height: '100%', borderRadius: 2 },

  /* --- Filter badge on row --- */
  filterBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
    backgroundColor: `${ACCENT}1A`, alignSelf: 'flex-start',
  },
  filterBadgeText: { color: ACCENT, fontSize: 10, fontWeight: '600' },

  /* --- Row actions (reorder + rotate) --- */
  rowActions: { gap: 4, alignItems: 'center' },
  rowActionBtn: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rowActionBtnDisabled: { opacity: 0.3 },

  /* --- Swipe-to-delete background --- */
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DANGER,
    borderRadius: 18,
    alignItems: 'flex-end', justifyContent: 'center', paddingRight: 16,
  },
  deleteAction: { alignItems: 'center', gap: 4 },
  deleteActionText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  /* --- Batch filter strip --- */
  batchFilterWrap: {
    paddingHorizontal: 16, paddingBottom: 10, gap: 8,
  },
  batchFilterLabel: {
    color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700', letterSpacing: 0.6,
  },
  batchFilterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  batchFilterChipText: { color: '#aaa', fontSize: 12, fontWeight: '600' },

  /* --- Footer --- */
  footer: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  footerRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, paddingVertical: 16, backgroundColor: ACCENT,
    shadowColor: '#00C8FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, paddingVertical: 13,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  secondaryBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
});
