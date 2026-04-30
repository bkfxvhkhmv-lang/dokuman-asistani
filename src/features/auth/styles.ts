/**
 * LoginBildschirm + alt bilesen stilleri.
 * Tek dosyada tutuldu cunku alt bilesenler ayni layout sistemi
 * (form > btn > googleBtn > vs.) icinde calisiyor.
 */
import { StyleSheet } from 'react-native';
import { Shadow } from '@/theme';

export const authStyles = StyleSheet.create({
  safe:      { flex: 1 },
  container: { flex: 1 },

  scrollContent:          { flexGrow: 1, paddingHorizontal: 24 },
  scrollContentCentered:  { justifyContent: 'center',    paddingTop: 28 },
  scrollContentKeyboard:  { justifyContent: 'flex-start', paddingTop: 20 },

  /* --- Brand header --- */
  header:        { alignItems: 'center', marginBottom: 28 },
  headerCompact: { marginBottom: 18 },
  logoBadge: {
    width: 74, height: 74, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden', ...Shadow.lg,
  },
  logoFrame: {
    position: 'absolute', width: 34, height: 34, borderRadius: 10,
    borderWidth: 4, borderColor: '#fff',
    transform: [{ rotate: '-22deg' }], left: 18, top: 22,
  },
  logoPlane: {
    position: 'absolute', right: 8, top: 7, color: '#fff', fontSize: 29,
    fontWeight: '800', transform: [{ rotate: '-18deg' }],
  },
  logoSpark: { position: 'absolute', left: 29, top: 31, color: '#FFB11A', fontSize: 16, fontWeight: '800' },
  title:    { fontSize: 28, fontWeight: '800', marginTop: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 6, lineHeight: 20, textAlign: 'center' },

  /* --- Tabs --- */
  tabs:    { flexDirection: 'row', borderRadius: 14, padding: 4, borderWidth: 1, marginBottom: 18 },
  tab:     { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '700' },

  /* --- Form --- */
  form:    { borderWidth: 1, borderRadius: 20, padding: 18 },
  btn:     { marginTop: 18, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.1 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 16, paddingVertical: 14, marginTop: 12, gap: 10,
  },

  secondaryActions: { marginTop: 20, paddingTop: 2, alignItems: 'center' },
  guestLinkWrap:    { paddingVertical: 6, paddingHorizontal: 8, alignItems: 'center' },

  hint: { marginTop: 16, textAlign: 'center', fontSize: 12 },
});
