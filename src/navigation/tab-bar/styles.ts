/**
 * Bottom tab bar tum stilleri.
 */
import { StyleSheet } from 'react-native';
import { AURA_W, AURA_CORE, PADDING_H } from '@/navigation/tab-bar/constants';

export const tabStyles = StyleSheet.create({
  portal: {
    position:        'absolute',
    left: 0, right: 0, bottom: 0, top: 0,
    justifyContent:  'flex-end',
  },
  container: {
    position:          'absolute',
    borderWidth:       1,
    borderRadius:      28,
    overflow:          'visible',     // ← scan butonu bar'in ustune tasabilsin
    paddingTop:        6,
    paddingHorizontal: PADDING_H,
    backgroundColor:   'transparent',
  },
  glassClip: {
    borderRadius: 28,
    overflow:     'hidden',           // ← blur/gradient yuvarlak kose icine kirpilsin
  },
  topEdge: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    height: 12,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
  },
  topGlow: {
    position: 'absolute',
    left: 18, right: 18, top: 0,
    height: 1,
    borderRadius: 999,
  },

  /* ── Aura ── */
  auraHalo: {
    position:     'absolute',
    top:          4,
    width:        AURA_W,
    height:       AURA_W,
    borderRadius: AURA_W / 2,
  },
  auraCore: {
    position:      'absolute',
    top:           14,
    width:         AURA_CORE,
    height:        AURA_CORE,
    borderRadius:  AURA_CORE / 2,
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius:  12,
  },

  /* ── Tabs ── */
  row: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    justifyContent: 'space-between',
    minHeight:      68,
  },
  item: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'flex-end',
    minHeight:      56,
    paddingBottom:  2,
  },
  scanItem: { justifyContent: 'flex-start' },
  iconWrap: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  scanWrap: {
    marginTop:    -28,
    marginBottom: -4,
    zIndex:       10, // glass katmaninin uzerinde render olsun
  },
  label: {
    marginTop:     3,
    fontWeight:    '700',
    letterSpacing: -0.1,
  },
  scanLabel: {
    marginTop:     1,
    fontWeight:    '700',
    letterSpacing: -0.1,
  },
  activePill: {
    width:        14,
    height:       3,
    borderRadius: 999,
    marginTop:    4,
  },
});
