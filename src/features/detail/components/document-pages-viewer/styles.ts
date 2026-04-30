import { StyleSheet } from 'react-native';
import { SCREEN_W, SCREEN_H } from '@/features/detail/components/document-pages-viewer/constants';

export const documentPagesViewerStyles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#000' },

  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 60,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  indicator: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
  },
  indicatorText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },

  verifyOverlay: {
    position: 'absolute',
    top: 64, left: 0, right: 0,
    alignItems: 'center',
    zIndex: 9,
  },

  swiper: { flex: 1 },
  pageWrap: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageImage: {
    width: SCREEN_W,
    height: SCREEN_H,
  },

  missingCard: {
    width: SCREEN_W * 0.78,
    padding: 24,
    borderRadius: 18,
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.40)',
    alignItems: 'center',
    gap: 10,
  },
  missingTitle: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  missingHint:  { color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center', lineHeight: 18 },

  thumbStrip: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
  },
  thumbStripInner: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
  thumb: {
    width: 52, height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  thumbActive: {
    borderColor: '#fff',
  },
  thumbImage: {
    width: '100%', height: '100%',
  },
  thumbMissing: {
    backgroundColor: 'rgba(248,113,113,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbBadge: {
    position: 'absolute',
    bottom: 2, right: 2,
    minWidth: 16, height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  empty: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.94)',
    paddingHorizontal: 28,
    gap: 18,
  },
  emptyText:  { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptyClose: {
    paddingHorizontal: 22, paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  emptyCloseText: { color: '#fff', fontWeight: '700' },
});
