import { StyleSheet } from 'react-native';
import { ONBOARDING_SLIDE_WIDTH } from '@/components/onboarding/onboarding.constants';

const W = ONBOARDING_SLIDE_WIDTH;

export const onboardingStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  atla:      { position: 'absolute', top: 56, right: 24, zIndex: 10 },
  atlaText:  { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500' },
  counter:   { position: 'absolute', top: 56, left: 24, zIndex: 10 },
  slide:     { width: W, alignItems: 'center', paddingHorizontal: 28, paddingTop: 80, paddingBottom: 20 },
  emojiWrap: { width: 100, height: 100, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  emoji:     { fontSize: 48 },
  titel:     { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12, letterSpacing: -0.5 },
  text:      { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22 },
  noktalar:  { flexDirection: 'row', gap: 8, marginBottom: 20 },
  nokta:     { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  noktaAktiv: { width: 28, backgroundColor: '#fff' },
  btn:       { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)', borderRadius: 18, paddingHorizontal: 48, paddingVertical: 16 },
  btnText:   { fontSize: 16, fontWeight: '700', color: '#fff' },
});
