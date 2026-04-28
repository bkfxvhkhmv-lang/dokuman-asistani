import React, { useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../ThemeContext';
import { PRIORITY_LANGS, OTHER_LANGS, DEFAULT_LANG } from '../i18n/langConfig';
import { LANG_KEY } from '../hooks/useLangPreference';

export const ONBOARDING_DONE_KEY = '@briefpilot_onboarding_done';

const TRUST = [
  'Belgeler cihazında saklanır',
  'İzin vermeden kimse göremez',
  'Almanya veri yasalarına uyumlu',
];

export default function OnboardingBildschirm() {
  const { Colors: C } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState<'lang' | 'main'>('lang');
  const [selectedLang, setSelectedLang] = useState(DEFAULT_LANG);
  const [showAll, setShowAll] = useState(false);

  const confirmLang = async () => {
    await AsyncStorage.setItem(LANG_KEY, selectedLang);
    setStep('main');
  };

  const finish = async (toScan = true) => {
    await AsyncStorage.multiSet([
      [ONBOARDING_DONE_KEY, 'true'],
      [LANG_KEY, selectedLang],
    ]);
    router.replace(toScan ? '/(tabs)/Kamera' : '/login');
  };

  // ── Dil seçimi ekranı ──────────────────────────────────────────────────────
  if (step === 'lang') {
    return (
      <View style={[st.root, { backgroundColor: C.bg, paddingBottom: insets.bottom + 24, paddingTop: insets.top + 24 }]}>
        <View style={st.langHeader}>
          <Text style={[st.langTitle, { color: C.text }]}>🌍  Sprache wählen</Text>
          <Text style={[st.langSub, { color: C.textSecondary }]}>Dil Seçin · Select Language</Text>
        </View>

        <ScrollView contentContainerStyle={st.langGrid} showsVerticalScrollIndicator={false}>
          {/* Öncelikli 7 dil */}
          {PRIORITY_LANGS.map(l => (
            <TouchableOpacity
              key={l.code}
              style={[st.langChip,
                { borderColor: selectedLang === l.code ? C.primary : C.border,
                  backgroundColor: selectedLang === l.code ? C.primaryLight : C.bgCard }]}
              onPress={() => setSelectedLang(l.code)}
              activeOpacity={0.8}
            >
              <Text style={st.langFlag}>{l.flag}</Text>
              <Text style={[st.langName, { color: selectedLang === l.code ? C.primaryDark : C.text }]}>
                {l.name}
              </Text>
              {selectedLang === l.code && (
                <Text style={{ color: C.primary, fontSize: 13, marginLeft: 'auto' }}>✓</Text>
              )}
            </TouchableOpacity>
          ))}

          {/* Diğer diller toggle */}
          <TouchableOpacity onPress={() => setShowAll(v => !v)} style={st.showMoreBtn}>
            <Text style={[st.showMoreText, { color: C.primary }]}>
              {showAll ? '▲ Weniger anzeigen' : '▼ Weitere Sprachen'}
            </Text>
          </TouchableOpacity>

          {showAll && OTHER_LANGS.map(l => (
            <TouchableOpacity
              key={l.code}
              style={[st.langChip,
                { borderColor: selectedLang === l.code ? C.primary : C.border,
                  backgroundColor: selectedLang === l.code ? C.primaryLight : C.bgCard }]}
              onPress={() => setSelectedLang(l.code)}
              activeOpacity={0.8}
            >
              <Text style={st.langFlag}>{l.flag}</Text>
              <Text style={[st.langName, { color: selectedLang === l.code ? C.primaryDark : C.text }]}>
                {l.name}
              </Text>
              {selectedLang === l.code && (
                <Text style={{ color: C.primary, fontSize: 13, marginLeft: 'auto' }}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 24 }}>
          <TouchableOpacity
            style={[st.primaryBtn, { backgroundColor: C.primary }]}
            onPress={confirmLang}
            activeOpacity={0.88}
          >
            <Text style={st.primaryBtnText}>Weiter →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Ana onboarding ekranı ──────────────────────────────────────────────────
  return (
    <View style={[st.root, { backgroundColor: C.bg, paddingBottom: insets.bottom + 24 }]}>

      {/* Üst logo alanı */}
      <LinearGradient
        colors={[C.primaryLight, C.bg]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[st.heroArea, { paddingTop: insets.top + 32 }]}
      >
        <View style={[st.brandMark, { backgroundColor: C.primary }]}>
          <View style={st.brandFrame} />
          <Text style={st.brandPlane}>➤</Text>
          <Text style={st.brandSpark}>✦</Text>
        </View>
        <Text style={[st.appName, { color: C.text }]}>BriefPilot</Text>
      </LinearGradient>

      {/* Ana içerik */}
      <View style={st.content}>
        <Text style={[st.title, { color: C.text }]}>
          Belgelerini anla.{'\n'}Fristleri kaçırma.
        </Text>

        <Text style={[st.subtitle, { color: C.textSecondary }]}>
          Vergi, sigorta, kira, mahkeme…{'\n'}
          Hepsi tek yerde, otomatik özetlenmiş.
        </Text>

        {/* Güven maddeleri */}
        <View style={[st.trustBox, { backgroundColor: C.bgCard, borderColor: C.borderLight }]}>
          {TRUST.map((item, i) => (
            <View key={i} style={[st.trustRow, i < TRUST.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: C.borderLight }]}>
              <View style={[st.checkCircle, { backgroundColor: `${C.success}18` }]}>
                <Text style={{ fontSize: 11, color: C.success }}>✓</Text>
              </View>
              <Text style={[st.trustText, { color: C.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA */}
      <View style={st.footer}>
        <TouchableOpacity
          style={[st.primaryBtn, { backgroundColor: C.primary }]}
          onPress={() => finish(true)}
          activeOpacity={0.88}
        >
          <Text style={st.primaryBtnText}>📷  İlk belgeni tara</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => finish(false)} activeOpacity={0.7}>
          <Text style={[st.loginLink, { color: C.textTertiary }]}>
            Hesabım var — <Text style={{ color: C.primary, fontWeight: '700' }}>Anmelden</Text>
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const st = StyleSheet.create({
  root:         { flex: 1 },
  langHeader:   { paddingHorizontal: 24, marginBottom: 20 },
  langTitle:    { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  langSub:      { fontSize: 13, marginTop: 6 },
  langGrid:     { paddingHorizontal: 24, gap: 8, paddingBottom: 16 },
  langChip:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  langFlag:     { fontSize: 22 },
  langName:     { fontSize: 15, fontWeight: '600', flex: 1 },
  showMoreBtn:  { paddingVertical: 10, alignItems: 'center' },
  showMoreText: { fontSize: 13, fontWeight: '600' },
  heroArea:   { alignItems: 'center', paddingBottom: 32, gap: 12 },
  brandMark:  { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  brandFrame: { position: 'absolute', width: 24, height: 24, borderRadius: 8, borderWidth: 3, borderColor: '#fff', transform: [{ rotate: '-22deg' }], left: 10, top: 13 },
  brandPlane: { position: 'absolute', right: 3, top: 1, color: '#fff', fontSize: 22, fontWeight: '800', transform: [{ rotate: '-18deg' }] },
  brandSpark: { position: 'absolute', left: 17, top: 18, color: '#FFB11A', fontSize: 11, fontWeight: '800' },
  appName:    { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  content:    { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  title:      { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, lineHeight: 38, marginBottom: 14 },
  subtitle:   { fontSize: 15, lineHeight: 24, marginBottom: 28 },
  trustBox:   { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  trustRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  checkCircle:{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trustText:  { fontSize: 14, fontWeight: '500', flex: 1 },
  footer:     { paddingHorizontal: 24, gap: 16, alignItems: 'center' },
  primaryBtn: { width: '100%', paddingVertical: 17, borderRadius: 16, alignItems: 'center' },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  loginLink:  { fontSize: 13 },
});
