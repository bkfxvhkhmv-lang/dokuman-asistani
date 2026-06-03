import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/ThemeContext';
import { useStore } from '@/store';
import { BetaAnalytics } from '@/services/BetaAnalytics';
import { PRIORITY_LANGS, OTHER_LANGS, DEFAULT_LANG } from '@/i18n/langConfig';
import { LANG_KEY } from '@/hooks/useLangPreference';
import {
  ONBOARDING_DONE_KEY,
  setAutoNotificationBlocked,
  setPendingFirstValueNavigation,
} from '@/product/onboardingStorage';
import { processSharedFile, normaliseSharedUri } from '@/services/ShareUploadService';

/**
 * Onboarding = Aktivierung: erster Beleg + „Dein nächster Schritt“ (first-value).
 * Kein Onboarding-Done-Flag vor First-Value — Ausnahme: direkt Anmelden.
 */
export default function OnboardingScreen() {
  const { Colors: C } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const [step, setStep] = useState<'lang' | 'splash' | 'activation'>('lang');
  const [selectedLang, setSelectedLang] = useState(DEFAULT_LANG);
  const [showAll, setShowAll] = useState(false);
  const [picking, setPicking] = useState(false);

  const confirmLang = async () => {
    await AsyncStorage.setItem(LANG_KEY, selectedLang);
    setStep('splash');
  };

  useEffect(() => {
    if (step !== 'splash') return;
    const id = setTimeout(() => setStep('activation'), 3000);
    return () => clearTimeout(id);
  }, [step]);

  const openScanner = useCallback(async () => {
    await AsyncStorage.setItem(LANG_KEY, selectedLang);
    await setAutoNotificationBlocked(true);
    await setPendingFirstValueNavigation();
    router.replace('/(tabs)/Kamera');
  }, [router, selectedLang]);

  const openFilePicker = useCallback(async () => {
    if (picking) return;
    setPicking(true);
    try {
      await AsyncStorage.setItem(LANG_KEY, selectedLang);
      await setAutoNotificationBlocked(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;

      let uri = res.assets[0].uri;
      const norm = await normaliseSharedUri(uri);
      if (norm) uri = norm;

      const result = await processSharedFile(uri, state.dokumente);
      if (!result) {
        Alert.alert('Konnte nicht lesen', 'Bitte andere Datei oder Foto über die Kamera.');
        return;
      }
      dispatch({ type: 'ADD_DOKUMENT', payload: result.dokument });
      void BetaAnalytics.trackEvent('onboarding_completed');
      router.replace('/(tabs)');
      router.push({ pathname: '/first-value', params: { dokId: result.dokument.id } });
    } finally {
      setPicking(false);
    }
  }, [dispatch, picking, router, selectedLang, state.dokumente]);

  const finishToLoginOnly = async () => {
    await AsyncStorage.multiSet([[LANG_KEY, selectedLang], [ONBOARDING_DONE_KEY, 'true']]);
    await setAutoNotificationBlocked(false);
    router.replace('/login');
  };

  const openDemo = useCallback(async () => {
    await AsyncStorage.multiSet([[LANG_KEY, selectedLang], [ONBOARDING_DONE_KEY, 'true']]);
    await setAutoNotificationBlocked(true);
    void BetaAnalytics.trackEvent('demo_opened');
    void BetaAnalytics.trackEvent('onboarding_completed');
    dispatch({ type: 'RESET_DEMO' });
    router.replace('/(tabs)/');
  }, [dispatch, router, selectedLang]);

  if (step === 'lang') {
    return (
      <View style={[st.root, { backgroundColor: C.bg, paddingBottom: insets.bottom + 24, paddingTop: insets.top + 24 }]}>
        <View style={st.langHeader}>
          <Text style={[st.langTitle, { color: C.text }]}>🌍  Sprache wählen</Text>
          <Text style={[st.langSub, { color: C.textSecondary }]}>Dil Seçin · Select Language</Text>
        </View>

        <ScrollView contentContainerStyle={st.langGrid} showsVerticalScrollIndicator={false}>
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

  if (step === 'splash') {
    return <SplashStep colors={C} insets={insets} />;
  }

  /* activation — nur zwei Wege + Login */
  return (
    <View style={[st.root, { backgroundColor: C.bg, paddingBottom: insets.bottom + 22 }]}>

      <LinearGradient
        colors={[C.primaryLight, C.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[st.heroTiny, { paddingTop: insets.top + 20 }]}
      >
        <Text style={[st.heroHint, { color: C.primaryDark }]}>BRIEFPILOT</Text>
        <Text style={[st.heroTinyTitle, { color: C.text }]}>Verstehe Briefe.{'\n'}Verpasse keine Frist.</Text>
      </LinearGradient>

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 26, gap: 14 }}>
        <Text style={[st.actLead, { color: C.text }]}>Dein erstes Dokument scannen</Text>
        <Text style={[st.actSub, { color: C.textSecondary }]}>
          Scanne einen Brief oder importiere ein PDF — BriefPilot zeigt dir sofort, was zu tun ist.
        </Text>

        <TouchableOpacity
          style={[st.primaryBtn, { backgroundColor: C.primary, opacity: picking ? 0.5 : 1 }]}
          onPress={openScanner}
          disabled={picking}
        >
          <Text style={st.primaryBtnText}>Erstes Dokument scannen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[st.secondaryBtn, { borderColor: `${C.primary}AA`, opacity: picking ? 0.5 : 1 }]}
          onPress={openFilePicker}
          disabled={picking}
        >
          <Text style={[st.secondaryTxt, { color: C.primary }]}>PDF importieren</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ alignItems: 'center', paddingVertical: 10, opacity: picking ? 0.5 : 1 }}
          onPress={openDemo}
          disabled={picking}
        >
          <Text style={{ fontSize: 13, color: C.textTertiary }}>
            Demo ansehen — <Text style={{ color: C.primary, fontWeight: '700' }}>ohne Scan</Text>
          </Text>
        </TouchableOpacity>

        <Text style={[st.miniTrust, { color: C.textTertiary }]}>
          Sicher verarbeitet · Du behältst die Kontrolle über deine Dokumente.
        </Text>
      </View>

      <TouchableOpacity onPress={finishToLoginOnly} style={{ alignItems: 'center', paddingTop: 6 }} disabled={picking}>
        <Text style={{ fontSize: 13, color: C.textTertiary }}>
          Ich habe schon ein Konto — <Text style={{ color: C.primary, fontWeight: '800' }}>Anmelden</Text>
        </Text>
      </TouchableOpacity>
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
  brandMark:  { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', marginBottom: 16 },
  brandFrame: { position: 'absolute', width: 24, height: 24, borderRadius: 8, borderWidth: 3, borderColor: '#fff', transform: [{ rotate: '-22deg' }], left: 10, top: 13 },
  brandPlane: { position: 'absolute', right: 3, top: 1, color: '#fff', fontSize: 22, fontWeight: '800', transform: [{ rotate: '-18deg' }] },
  brandSpark: { position: 'absolute', left: 17, top: 18, color: '#FFB11A', fontSize: 11, fontWeight: '800' },
  pulseBrand: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginBottom: 14 },
  pulseLine:  { fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 300 },
  splashHint: { fontSize: 12, fontWeight: '600' },
  heroTiny:   { paddingHorizontal: 24, paddingBottom: 20 },
  heroHint:   { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 10 },
  heroTinyTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  actLead:    { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginBottom: 8 },
  actSub:     { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  miniTrust:  { fontSize: 11, lineHeight: 16, marginTop: 8, textAlign: 'center' },
  primaryBtn: { width: '100%', paddingVertical: 17, borderRadius: 16, alignItems: 'center' },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  secondaryBtn: { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 2, backgroundColor: 'transparent' },
  secondaryTxt: { fontSize: 15, fontWeight: '800' },
});

// ── Splash step (animated) ────────────────────────────────────────────────────

const VALUE_PROPS = [
  '📄  Brief scannen',
  '✦  KI erkennt alles',
  '✅  Nächster Schritt klar',
];

function SplashStep({ colors: C, insets }: { colors: any; insets: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.88)).current;
  const rowFade = useRef(VALUE_PROPS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }),
    ]).start();

    VALUE_PROPS.forEach((_, i) => {
      Animated.timing(rowFade[i], {
        toValue: 1, duration: 340, delay: 480 + i * 180, useNativeDriver: true,
      }).start();
    });
  }, []);

  return (
    <View style={[st.root, { backgroundColor: C.bg, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28, paddingHorizontal: 28, justifyContent: 'center' }]}>
      <Animated.View style={{ alignItems: 'center', opacity, transform: [{ scale }] }}>
        <View style={[st.brandMark, { backgroundColor: C.primary }]}>
          <View style={st.brandFrame} />
          <Text style={st.brandPlane}>➤</Text>
          <Text style={st.brandSpark}>✦</Text>
        </View>
        <Text style={[st.pulseBrand, { color: C.text }]}>BriefPilot</Text>
        <Text style={[st.pulseLine, { color: C.textSecondary }]}>
          Sagt dir, was du mit deinem Dokument tun sollst — in wenigen Sekunden.
        </Text>
      </Animated.View>

      <View style={{ marginTop: 32, gap: 12 }}>
        {VALUE_PROPS.map((label, i) => (
          <Animated.View
            key={label}
            style={{
              opacity: rowFade[i],
              transform: [{ translateY: rowFade[i].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: C.bgCard, borderRadius: 14, padding: 14,
              borderWidth: 1, borderColor: C.borderLight,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{label}</Text>
          </Animated.View>
        ))}
      </View>

      <Animated.Text style={[st.splashHint, { color: C.textTertiary, textAlign: 'center', marginTop: 28, opacity }]}>
        gleich weiter …
      </Animated.Text>
    </View>
  );
}
