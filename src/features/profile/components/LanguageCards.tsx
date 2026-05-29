/**
 * UI dili + AI dil kartlari.
 *
 * Iki ayri kart cikariyor cunku semantik olarak farkli (UI dili kullanici
 * arayuz metni icin, AI dili modelden gelen yanit dili icin). Davranis
 * benzer oldugu icin tek dosyada paylasiyorlar.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/ThemeContext';
import { useLangPreference } from '@/hooks/useLangPreference';
import { LANGUAGES } from '@/i18n/langConfig';
import { AI_LANGUAGES } from '@/i18n/aiLangConfig';

/* ── UILanguageCard ──────────────────────────────────────────────── */

interface UILangProps {
  /** Legacy props kept for compatibility — ignored, reads from context directly */
  lang?:       string;
  changeLang?: (code: any) => void;
  bare?: boolean;
}

export function UILanguageCard({ bare }: UILangProps) {
  const { lang, changeLang } = useLangPreference();
  const { Colors: C, Shadow } = useTheme();
  const pills = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 4, paddingVertical: 2 }}>
      {LANGUAGES.map(l => (
        <TouchableOpacity
          key={l.code}
          style={{
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
            borderWidth: 1.5,
            borderColor:     lang === l.code ? C.primary : C.border,
            backgroundColor: lang === l.code ? C.primaryLight : C.bgInput,
          }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            changeLang(l.code);
          }}
          activeOpacity={0.75}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: lang === l.code ? '700' : '500',
              color:      lang === l.code ? C.primaryDark : C.textSecondary,
            }}
          >
            {l.flag} {l.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const hint = (
    <Text
      style={{
        fontSize: 11,
        color: C.textTertiary,
        marginTop: bare ? 8 : 12,
        marginHorizontal: 16,
        letterSpacing: 0.1,
      }}
    >
      App-Oberfläche und Buttons erscheinen in dieser Sprache.
    </Text>
  );
  if (bare) {
    return (
      <View style={{ paddingVertical: 10 }}>
        {pills}
        {hint}
      </View>
    );
  }
  return (
    <View
      style={{
        backgroundColor: C.bgCard, borderRadius: 20, padding: 18,
        ...Shadow.sm, borderWidth: 1, borderColor: C.borderLight,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '800', color: C.textTertiary, marginBottom: 14, letterSpacing: 0.8 }}>
        APP‑SPRACHE
      </Text>
      {pills}
      {hint}
    </View>
  );
}

/* ── AILanguageCard ──────────────────────────────────────────────── */

interface AILangProps {
  aiLang:       string;
  changeAiLang: (code: any) => void;
  bare?: boolean;
}

export function AILanguageCard({ aiLang, changeAiLang, bare }: AILangProps) {
  const { Colors: C, Shadow } = useTheme();
  const pills = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 4, paddingVertical: 2 }}>
      {AI_LANGUAGES.filter(l => l.priority).map(l => (
        <TouchableOpacity
          key={l.code}
          style={{
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
            borderWidth: 1.5,
            borderColor:     aiLang === l.code ? C.primary : C.border,
            backgroundColor: aiLang === l.code ? C.primaryLight : C.bgInput,
          }}
          onPress={() => changeAiLang(l.code)}
          activeOpacity={0.75}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: aiLang === l.code ? '700' : '500',
              color:      aiLang === l.code ? C.primaryDark : C.textSecondary,
            }}
          >
            {l.flag} {l.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const hint = (
    <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: bare ? 8 : 12, letterSpacing: 0.1 }}>
      Zusammenfassungen und Hinweise der KI erscheinen in dieser Sprache.
    </Text>
  );
  if (bare) {
    return (
      <View style={{ paddingVertical: 10 }}>
        {pills}
        {hint}
      </View>
    );
  }
  return (
    <View
      style={{
        backgroundColor: C.bgCard, borderRadius: 20, padding: 18,
        ...Shadow.sm, borderWidth: 1, borderColor: C.borderLight,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '800', color: C.textTertiary, marginBottom: 14, letterSpacing: 0.8 }}>
        KI-ANTWORT‑SPRACHE
      </Text>
      {pills}
      {hint}
    </View>
  );
}
